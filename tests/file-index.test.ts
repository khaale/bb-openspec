import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
  utimes,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type {
  ExperimentalHostRpcContext,
  ExperimentalHostWatchListener,
  ExperimentalHostWatchOptions,
} from "@get-bb/plugin-sdk/host";
import { OpenSpecIndex } from "../src/file-index.ts";
import { WatchPool } from "../src/watch-pool.ts";
import type { hostSignals } from "../src/host-contract.ts";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "openspec-watch-test-"));
  async function write(file: string, text: string) {
    const absolute = path.join(root, "openspec", file);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, text);
  }
  await write("changes/a/tasks.md", "## 1. Tasks\n- [ ] 1.1 A");
  await write("changes/b/tasks.md", "- [x] B");
  await write("changes/archive/2026-10-01-old/tasks.md", "- [x] Old");
  return {
    root,
    write,
    dispose: () => rm(root, { recursive: true, force: true }),
  };
}

test("idle snapshots and updates of one file do not reread unrelated tasks", async () => {
  const f = await fixture();
  const reads: string[] = [];
  try {
    const index = new OpenSpecIndex(f.root, (file) => reads.push(file));
    await index.initialize();
    assert.equal(reads.length, 3);
    reads.length = 0;
    for (let count = 0; count < 10; count++) {
      index.snapshot();
      index.change("a");
    }
    assert.deepEqual(reads, []);
    await f.write("changes/a/tasks.md", "- [x] A");
    await index.update([{ path: "changes/a/tasks.md", type: "update" }]);
    assert.deepEqual(reads, ["changes/a/tasks.md"]);
    assert.equal(index.change("a").change.done, 1);
    assert.equal(index.change("b").change.done, 1);
    reads.length = 0;
    await f.write("changes/a/design.md", "Design");
    await index.update([{ path: "changes/a/design.md", type: "create" }]);
    assert.deepEqual(reads, []);
    assert.deepEqual(
      index.change("a").change.artifacts.find((a) => a.kind === "design")
        ?.paths,
      ["changes/a/design.md"],
    );
    await f.write("changes/c/tasks.md", "- [ ] C");
    await index.update([{ path: "changes/c", type: "create" }]);
    assert.deepEqual(reads, ["changes/c/tasks.md"]);
    await rm(path.join(f.root, "openspec/changes/a/tasks.md"));
    await index.update([{ path: "changes/a/tasks.md", type: "delete" }]);
    assert.equal(index.change("a").change.total, 0);
  } finally {
    await f.dispose();
  }
});

test("rescan repairs missed changes and confines symlinked task files", async () => {
  const f = await fixture();
  try {
    const index = new OpenSpecIndex(f.root);
    await index.initialize();
    await f.write("changes/a/tasks.md", "- [x] A");
    await index.update(null);
    assert.equal(index.change("a").change.done, 1);
    await writeFile(path.join(f.root, "outside.md"), "- [x] Secret");
    await rm(path.join(f.root, "openspec/changes/a/tasks.md"));
    await symlink(
      path.join(f.root, "outside.md"),
      path.join(f.root, "openspec/changes/a/tasks.md"),
    );
    await index.update([{ path: "changes/a/tasks.md", type: "update" }]);
    assert.match(index.change("a").change.error ?? "", /outside the OpenSpec/);
    assert.equal(index.change("a").change.total, 0);
  } finally {
    await f.dispose();
  }
});

function driver() {
  const watches: {
    options: ExperimentalHostWatchOptions;
    listener: ExperimentalHostWatchListener;
    disposed: boolean;
  }[] = [];
  const signals: unknown[] = [];
  const context = {
    signal: new AbortController().signal,
    lifecycle: { signal: new AbortController().signal },
    experimental_paths: { dataDir: tmpdir(), tempDir: tmpdir() },
    experimental_emitSignal: async (_name: string, payload: unknown) => {
      signals.push(payload);
    },
    experimental_watch: async (
      options: ExperimentalHostWatchOptions,
      listener: ExperimentalHostWatchListener,
    ) => {
      const item = { options, listener, disposed: false };
      watches.push(item);
      return {
        dispose: async () => {
          item.disposed = true;
        },
      };
    },
    experimental_retainWorker: () => ({ dispose: async () => {} }),
  } satisfies ExperimentalHostRpcContext<typeof hostSignals>;
  return { watches, signals, context };
}

async function waitFor(condition: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("Watcher did not reach the expected state");
}

test("panels and environments sharing a directory use one watcher until the last leaves", async () => {
  const f = await fixture();
  const pool = new WatchPool();
  const d = driver();
  try {
    await Promise.all([
      pool.subscribe(
        {
          workspacePath: f.root,
          environmentId: "env-a",
          subscriptionId: "one",
        },
        d.context,
      ),
      pool.subscribe(
        {
          workspacePath: f.root,
          environmentId: "env-b",
          subscriptionId: "two",
        },
        d.context,
      ),
    ]);
    assert.equal(d.watches.length, 1);
    await pool.unsubscribe("one");
    assert.equal(d.watches[0].disposed, false);
    await f.write("changes/a/tasks.md", "- [x] A");
    await d.watches[0].listener({
      kind: "changed",
      changes: [{ path: "changes/a/tasks.md", type: "update" }],
    });
    assert.equal(
      (await pool.snapshot(f.root)).changes.find((c) => c.id === "a")?.done,
      1,
    );
    await pool.unsubscribe("two");
    assert.equal(d.watches[0].disposed, true);
    // No retained cache: an explicit read after unwatch sees the disk again.
    await f.write("changes/a/tasks.md", "- [ ] A");
    assert.equal(
      (await pool.snapshot(f.root)).changes.find((c) => c.id === "a")?.done,
      0,
    );
  } finally {
    await pool.dispose();
    await f.dispose();
  }
});

test("deleting and recreating OpenSpec switches the native root without losing updates", async () => {
  const f = await fixture();
  const pool = new WatchPool();
  const d = driver();
  try {
    await pool.subscribe(
      { workspacePath: f.root, environmentId: "env", subscriptionId: "one" },
      d.context,
    );
    await rm(path.join(f.root, "openspec"), { recursive: true });
    await d.watches[0].listener({ kind: "rescan-required" });
    await waitFor(() => d.watches.length === 2);
    assert.equal(d.watches[0].disposed, true);
    assert.equal(d.watches[1].options.rootPath, f.root);
    assert.equal((await pool.snapshot(f.root)).missing, true);
    await f.write("changes/new/tasks.md", "- [ ] New");
    await d.watches[1].listener({
      kind: "changed",
      changes: [{ path: "openspec", type: "create" }],
    });
    await waitFor(() => d.watches.length === 3);
    assert.equal(d.watches[2].options.rootPath, path.join(f.root, "openspec"));
    assert.equal((await pool.snapshot(f.root)).changes[0].id, "new");
  } finally {
    await pool.dispose();
    await f.dispose();
  }
});

test("watch errors are visible and manual refresh replaces the failed watch", async () => {
  const f = await fixture();
  const pool = new WatchPool();
  const d = driver();
  try {
    await pool.subscribe(
      { workspacePath: f.root, environmentId: "env", subscriptionId: "one" },
      d.context,
    );
    await d.watches[0].listener({
      kind: "watch-error",
      message: "Native watcher failed",
    });
    assert.equal(
      (await pool.snapshot(f.root)).watchError,
      "Native watcher failed",
    );
    await f.write("changes/a/tasks.md", "- [x] A");
    await pool.refresh(f.root);
    assert.equal(d.watches[0].disposed, true);
    assert.equal((await pool.snapshot(f.root)).watchError, null);
    assert.equal((await pool.change(f.root, "a")).change.done, 1);
  } finally {
    await pool.dispose();
    await f.dispose();
  }
});

test("a subscription switches planning roots and closes the old watcher", async () => {
  const left = await fixture();
  const right = await fixture();
  const pool = new WatchPool();
  const d = driver();
  try {
    const subscription = { environmentId: "code-env", subscriptionId: "panel" };
    await pool.subscribe(
      { ...subscription, workspacePath: left.root },
      d.context,
    );
    await pool.subscribe(
      { ...subscription, workspacePath: right.root },
      d.context,
    );
    assert.equal(d.watches.length, 2);
    assert.equal(d.watches[0].disposed, true);
    assert.equal(
      d.watches[1].options.rootPath,
      path.join(right.root, "openspec"),
    );
    await right.write("changes/a/tasks.md", "- [x] Store task");
    await d.watches[1].listener({
      kind: "changed",
      changes: [{ path: "changes/a/tasks.md", type: "update" }],
    });
    assert.equal((await pool.change(right.root, "a")).change.done, 1);
    assert.equal((await pool.change(left.root, "a")).change.done, 0);
    await pool.unsubscribe("panel");
    assert.equal(d.watches[1].disposed, true);
  } finally {
    await pool.dispose();
    await left.dispose();
    await right.dispose();
  }
});

test("artifact modification times update recency without reading unrelated tasks", async () => {
  const f = await fixture();
  const reads: string[] = [];
  const index = new OpenSpecIndex(f.root, (file) => reads.push(file));
  try {
    await index.initialize();
    reads.length = 0;
    await f.write("changes/a/design.md", "Updated design");
    const timestamp = new Date("2030-01-01T00:00:00Z");
    await utimes(
      path.join(f.root, "openspec/changes/a/design.md"),
      timestamp,
      timestamp,
    );
    await index.update([{ path: "changes/a/design.md", type: "create" }]);
    assert.equal(index.change("a").change.updatedAt, timestamp.getTime());
    assert.deepEqual(reads, []);
  } finally {
    await f.dispose();
  }
});
