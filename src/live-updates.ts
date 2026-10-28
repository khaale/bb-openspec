import { randomUUID } from "node:crypto";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { hostContract, hostSignals } from "./host-contract";
import { changeForPath } from "./change-paths";
import { liveTags } from "./live-tags";
import { workspace } from "./reader";
import { errorMessage } from "./reader-error";

export function createHostClient(bb: BbPluginApi) {
  return bb.hosts.experimental_client({
    contract: hostContract,
    experimental_signals: hostSignals,
  });
}
type Host = ReturnType<typeof createHostClient>;

export function registerLiveUpdates(bb: BbPluginApi, host: Host) {
  const active = new Map<
    string,
    {
      subscriptionId: string;
      environmentId: string;
      workspacePath: string;
      hostId: string;
    }
  >();
  const knownHosts = new Set<string>();
  const failures = new Map<string, string>();
  const disposers: (() => void)[] = [];
  let activate!: () => void;
  const ready = new Promise<void>((resolve) => {
    activate = resolve;
  });
  bb.background.service("openspec-live", {
    async start(signal) {
      activate();
      if (!signal.aborted)
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
    },
  });
  bb.onDispose(activate);

  async function start(
    entry: typeof active extends Map<string, infer T> ? T : never,
  ) {
    try {
      await host.call(
        "watch",
        {
          subscriptionId: entry.subscriptionId,
          environmentId: entry.environmentId,
          workspacePath: entry.workspacePath,
        },
        { hostId: entry.hostId },
      );
      failures.delete(entry.environmentId);
    } catch (cause) {
      failures.set(entry.environmentId, errorMessage(cause));
    }
    bb.rpc.experimental_invalidate([liveTags.changes(entry.environmentId)]);
  }

  bb.rpc.experimental_whileWatched("changes", async (read, signal) => {
    if (!("input" in read)) return;
    // Reload can restore reads before activation; services start after activation.
    await ready;
    if (signal.aborted) return;
    const { environmentId } = rpcInput(read.input);
    const source = await workspace(bb.sdk, environmentId);
    if (signal.aborted) return;
    const entry = {
      subscriptionId: randomUUID(),
      environmentId,
      workspacePath: source.path,
      hostId: source.hostId,
    };
    knownHosts.add(source.hostId);
    active.set(entry.subscriptionId, entry);
    try {
      await start(entry);
      if (!signal.aborted)
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
    } finally {
      active.delete(entry.subscriptionId);
      if (
        ![...active.values()].some(
          (item) => item.environmentId === environmentId,
        )
      )
        failures.delete(environmentId);
      try {
        await host.call(
          "unwatch",
          { subscriptionId: entry.subscriptionId },
          { hostId: source.hostId },
        );
      } catch (cause) {
        bb.log.warn(`OpenSpec watcher cleanup: ${errorMessage(cause)}`);
      }
    }
  });

  disposers.push(
    host.experimental_onSignal("changed", ({ hostId, payload }) => {
      if (
        ![...active.values()].some(
          (entry) =>
            entry.hostId === hostId &&
            entry.environmentId === payload.environmentId,
        )
      )
        return;
      const tags = new Set<string>();
      if (payload.rescan || payload.structural || payload.error)
        tags.add(liveTags.changes(payload.environmentId));
      if (payload.rescan || payload.structural) {
        // Structural changes can add/remove the selected artifact as well as its task file.
        bb.rpc.experimental_invalidate([
          liveTags.environment(payload.environmentId),
        ]);
        return;
      }
      for (const file of payload.paths) {
        tags.add(liveTags.document(payload.environmentId, file));
        const changeId = changeForPath(file);
        if (changeId && file === `changes/${changeId}/tasks.md`) {
          tags.add(liveTags.changes(payload.environmentId));
          tags.add(liveTags.detail(payload.environmentId, changeId));
        }
      }
      if (tags.size) bb.rpc.experimental_invalidate([...tags]);
    }),
  );

  async function restoreHost(hostId: string) {
    if (!knownHosts.has(hostId)) return;
    const entries = [...active.values()].filter(
      (entry) => entry.hostId === hostId,
    );
    try {
      await host.call(
        "reconcile",
        {
          subscriptions: entries.map(
            ({ subscriptionId, environmentId, workspacePath }) => ({
              subscriptionId,
              environmentId,
              workspacePath,
            }),
          ),
        },
        { hostId },
      );
      for (const entry of entries) failures.delete(entry.environmentId);
    } catch (cause) {
      for (const entry of entries)
        failures.set(entry.environmentId, errorMessage(cause));
    }
    if (!entries.length) knownHosts.delete(hostId);
    for (const entry of entries)
      bb.rpc.experimental_invalidate([
        liveTags.environment(entry.environmentId),
      ]);
  }
  disposers.push(
    host.experimental_onWorkerExit(({ hostId }) => restoreHost(hostId)),
  );
  disposers.push(
    bb.sdk.subscribe({
      event: "host:changed",
      callback: (event) => {
        if (event.id) void restoreHost(event.id);
      },
    }),
  );

  const threadEvents = [
    "thread.created",
    "thread.active",
    "thread.idle",
    "thread.failed",
    "thread.archived",
    "thread.unarchived",
    "thread.deleted",
  ] as const;
  for (const event of threadEvents) {
    bb.events.on(event, ({ thread }) => {
      if (thread.environmentId)
        bb.rpc.experimental_invalidate([
          liveTags.threads(thread.environmentId),
          liveTags.changes(thread.environmentId),
        ]);
    });
  }
  bb.onDispose(() => {
    for (const dispose of disposers) dispose();
  });
  return {
    error: (environmentId: string) => failures.get(environmentId) ?? null,
    refresh: async (environmentId: string) => {
      await Promise.all(
        [...active.values()]
          .filter((entry) => entry.environmentId === environmentId)
          .map(start),
      );
    },
  };
}

function rpcInput(input: unknown): { environmentId: string } {
  if (
    typeof input !== "object" ||
    input === null ||
    !("environmentId" in input) ||
    typeof input.environmentId !== "string"
  )
    throw new Error("Требуется окружение наблюдения.");
  return { environmentId: input.environmentId };
}
