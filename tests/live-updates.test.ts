import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { createHostClient, registerLiveUpdates } from "../src/live-updates.ts";

test("live producer scopes file invalidation, reconciles on restart and releases its own subscription", async () => {
  const { bb, harness } = createFakePluginHost({ pluginId: "openspec" });
  harness.sdk.stub("subscribe", () => () => {});
  harness.sdk.stub("environments.get", async () => ({
    id: "env",
    projectId: "project",
    path: "/project",
    hostId: "host",
    status: "ready",
    lifecycle: { phase: "active" },
    name: null,
    branchName: null,
  }));
  let producer!: Parameters<typeof bb.rpc.experimental_whileWatched>[1];
  bb.rpc.experimental_whileWatched = (method, handler) => {
    assert.equal(method, "changes");
    producer = handler;
  };
  const invalidations: string[][] = [];
  bb.rpc.experimental_invalidate = (tags) => {
    invalidations.push([...tags]);
  };
  const host = createHostClient(bb);
  const calls: { method: string; input: unknown }[] = [];
  host.call = async (method, input) => {
    calls.push({ method, input });
    return null as never;
  };
  let changed!: Parameters<typeof host.experimental_onSignal<"changed">>[1];
  let exited!: Parameters<typeof host.experimental_onWorkerExit>[0];
  host.experimental_onSignal = (_name, handler) => {
    changed = handler;
    return () => {};
  };
  host.experimental_onWorkerExit = (handler) => {
    exited = handler;
    return () => {};
  };
  registerLiveUpdates(bb, host);
  const first = new AbortController();
  const second = new AbortController();
  const running1 = producer({ input: { environmentId: "env" } }, first.signal);
  assert.equal(
    calls.length,
    0,
    "restored subscriptions must not call host RPC during factory registration",
  );
  const service = harness.behavior.runService("openspec-live");
  await setImmediate();
  const running2 = producer({ input: { environmentId: "env" } }, second.signal);
  await setImmediate();
  try {
    const watches = calls.filter((c) => c.method === "watch");
    assert.equal(watches.length, 2);
    assert.notDeepEqual(watches[0].input, watches[1].input);
    invalidations.length = 0;
    await changed({
      hostId: "host",
      payload: {
        environmentId: "env",
        paths: ["changes/example/tasks.md"],
        structural: false,
        rescan: false,
        error: null,
      },
    });
    assert.deepEqual(
      new Set(invalidations.flat()),
      new Set([
        "openspec:document:env:changes/example/tasks.md",
        "openspec:changes:env",
        "openspec:detail:env:example",
      ]),
    );
    invalidations.length = 0;
    await changed({
      hostId: "host",
      payload: {
        environmentId: "env",
        paths: [],
        structural: true,
        rescan: true,
        error: null,
      },
    });
    assert.deepEqual(invalidations, [["openspec:environment:env"]]);
    first.abort();
    await running1;
    assert.equal(calls.filter((c) => c.method === "unwatch").length, 1);
    await exited({ hostId: "host" });
    const reconcile = calls.find((c) => c.method === "reconcile")?.input as {
      subscriptions: unknown[];
    };
    assert.deepEqual(reconcile.subscriptions, [watches[1].input]);
    second.abort();
    await running2;
    assert.equal(calls.filter((c) => c.method === "unwatch").length, 2);
    invalidations.length = 0;
    await changed({
      hostId: "host",
      payload: {
        environmentId: "env",
        paths: [],
        structural: true,
        rescan: true,
        error: null,
      },
    });
    assert.deepEqual(invalidations, []);
  } finally {
    first.abort();
    second.abort();
    await Promise.all([running1, running2]);
    service.controller.abort();
    await service.done;
    await harness.lifecycle.dispose();
  }
});
