import path from "node:path";
import { readdir } from "node:fs/promises";
import type {
  ExperimentalHostRpcContext,
  ExperimentalHostWatchSubscription,
  ExperimentalHostWatchEvent,
} from "@get-bb/plugin-sdk/host";
import type { hostSignals } from "./host-contract";
import {
  OpenSpecIndex,
  exists,
  type FileChange,
  type FileUpdate,
} from "./file-index";
import { safeRelative } from "./change-paths";
import { errorMessage } from "./reader-error";

type Context = ExperimentalHostRpcContext<typeof hostSignals>;
type RecordEntry = {
  index: OpenSpecIndex;
  subscribers: Map<string, string>;
  context: Context;
  queue: Promise<void>;
  starting?: Promise<void>;
  watcher?: ExperimentalHostWatchSubscription;
  watchingParent: boolean;
  error: string | null;
  closed: boolean;
  rearm?: NodeJS.Immediate;
};

export class WatchPool {
  private records = new Map<string, RecordEntry>();
  private subscriptions = new Map<string, RecordEntry>();

  private enqueue(record: RecordEntry, work: () => Promise<void>) {
    const next = record.queue.then(work);
    record.queue = next.catch((cause) => {
      record.error = errorMessage(cause);
    });
    return next;
  }

  private async publish(record: RecordEntry, update: FileUpdate) {
    if (record.closed) return;
    await Promise.all(
      [...new Set(record.subscribers.values())].map((environmentId) =>
        record.context
          .experimental_emitSignal("changed", {
            environmentId,
            ...update,
            error: record.error,
          })
          .catch(() => {
            /* Ephemeral delivery can be lost while disconnected; reconnect rescans. */
          }),
      ),
    );
  }

  private normalize(
    record: RecordEntry,
    event: ExperimentalHostWatchEvent,
  ): FileChange[] | null {
    if (event.kind !== "changed") return null;
    const root = record.watchingParent
      ? record.index.workspacePath
      : record.index.root;
    const changes: FileChange[] = [];
    for (const change of event.changes) {
      let relative = path.isAbsolute(change.path)
        ? path.relative(root, change.path)
        : change.path;
      relative = relative.split(path.sep).join("/");
      if (record.watchingParent) {
        if (relative === "openspec") return null;
        if (!relative.startsWith("openspec/")) continue;
        relative = relative.slice("openspec/".length);
      }
      if (!relative || relative === ".") return null;
      try {
        changes.push({ path: safeRelative(relative), type: change.type });
      } catch {
        /* Out-of-root events cannot affect this index. */
      }
    }
    return changes;
  }

  private async startWatcher(record: RecordEntry) {
    if (record.closed || record.watcher) return;
    const parent = !(await exists(record.index.root));
    const ignoredPaths = parent
      ? (await readdir(record.index.workspacePath)).filter(
          (name) => name !== "openspec",
        )
      : [];
    record.watchingParent = parent;
    record.watcher = await record.context.experimental_watch(
      {
        rootPath: parent ? record.index.workspacePath : record.index.root,
        ignoredPaths,
        debounceMs: 120,
        maxWaitMs: 700,
      },
      async (event) => {
        if (record.closed) return;
        if (event.kind === "watch-error" && (await exists(record.index.root))) {
          record.error = event.message;
          await this.publish(record, {
            paths: [],
            structural: false,
            rescan: true,
          });
          return;
        }
        const changes = this.normalize(record, event);
        if (changes !== null && !changes.length) return;
        try {
          await this.enqueue(record, async () => {
            const update = await record.index.update(changes);
            record.error = null;
            await this.publish(record, update);
          });
        } catch {
          await this.publish(record, {
            paths: [],
            structural: true,
            rescan: true,
          });
        }
        if (
          record.watchingParent !== record.index.snapshot().missing &&
          !record.rearm
        ) {
          // Dispose outside the current native delivery to avoid waiting on ourselves.
          record.rearm = setImmediate(() => {
            record.rearm = undefined;
            void this.rearm(record).catch(async (cause) => {
              record.error = errorMessage(cause);
              await this.publish(record, {
                paths: [],
                structural: true,
                rescan: true,
              });
            });
          });
        }
      },
    );
  }

  private async rearm(record: RecordEntry) {
    await record.watcher?.dispose();
    record.watcher = undefined;
    if (!record.closed) await this.startWatcher(record);
  }

  async subscribe(
    input: {
      workspacePath: string;
      environmentId: string;
      subscriptionId: string;
    },
    context: Context,
  ) {
    const key = path.resolve(input.workspacePath);
    const previous = this.subscriptions.get(input.subscriptionId);
    if (previous?.index.workspacePath === key) return;
    if (previous) await this.unsubscribe(input.subscriptionId);
    let record = this.records.get(key);
    if (!record) {
      const index = new OpenSpecIndex(key);
      record = {
        index,
        subscribers: new Map(),
        context,
        queue: Promise.resolve(),
        watchingParent: false,
        error: null,
        closed: false,
      };
      this.records.set(key, record);
      const owner = record;
      owner.starting = (async () => {
        try {
          await this.startWatcher(owner);
        } catch (cause) {
          owner.error = errorMessage(cause);
        }
        try {
          await this.enqueue(owner, () => index.initialize());
        } catch (cause) {
          owner.error = errorMessage(cause);
        }
      })();
    }
    record.subscribers.set(input.subscriptionId, input.environmentId);
    this.subscriptions.set(input.subscriptionId, record);
    await record.starting;
    await record.queue;
    await this.publish(record, { paths: [], structural: true, rescan: true });
  }

  async unsubscribe(subscriptionId: string) {
    const record = this.subscriptions.get(subscriptionId);
    if (!record) return;
    this.subscriptions.delete(subscriptionId);
    record.subscribers.delete(subscriptionId);
    if (record.subscribers.size) return;
    record.closed = true;
    this.records.delete(record.index.workspacePath);
    if (record.rearm) clearImmediate(record.rearm);
    await record.starting;
    await record.queue;
    await record.watcher?.dispose();
  }

  private async index(workspacePath: string) {
    const record = this.records.get(path.resolve(workspacePath));
    if (record) {
      await record.starting;
      await record.queue;
      return { index: record.index, error: record.error };
    }
    const index = new OpenSpecIndex(workspacePath);
    await index.initialize();
    return { index, error: null };
  }

  async snapshot(workspacePath: string) {
    const { index, error } = await this.index(workspacePath);
    return { ...index.snapshot(), watchError: error };
  }

  async change(workspacePath: string, changeId: string) {
    return (await this.index(workspacePath)).index.change(changeId);
  }

  async refresh(workspacePath: string) {
    const record = this.records.get(path.resolve(workspacePath));
    if (!record) return;
    await record.starting;
    await this.rearm(record);
    await this.enqueue(record, async () => {
      await record.index.initialize();
      record.error = null;
    });
    await this.publish(record, { paths: [], structural: true, rescan: true });
  }

  async reconcile(
    inputs: {
      workspacePath: string;
      environmentId: string;
      subscriptionId: string;
    }[],
    context: Context,
  ) {
    const desired = new Set(inputs.map((input) => input.subscriptionId));
    await Promise.all(
      [...this.subscriptions.keys()]
        .filter((id) => !desired.has(id))
        .map((id) => this.unsubscribe(id)),
    );
    for (const input of inputs) await this.subscribe(input, context);
    await Promise.all(
      [...new Set(inputs.map((input) => input.workspacePath))].map((root) =>
        this.refresh(root),
      ),
    );
  }

  async dispose() {
    await Promise.all(
      [...this.subscriptions.keys()].map((id) => this.unsubscribe(id)),
    );
  }
}
