import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  createFakePluginHost,
  makeThreadResponse,
  experimental_scanPublicSdkOnly,
} from "@get-bb/plugin-sdk/testing";
import { artifactsFor, changeForPath } from "../src/change-paths.ts";
import plugin from "../server.ts";
import { rpcContract } from "../src/contract.ts";
import { ACTION, parseTasks, progress, changeTitle } from "../src/model.ts";

function setup() {
  const documents: Record<string, string> = {
    "changes/example/.openspec.yaml": "schema: spec-driven",
    "changes/example/proposal.md": "## Why\nExample",
    "changes/example/tasks.md":
      "## 1. Work\n- [x] 1.1 Read\n- [ ] 1.2 Implement",
    "changes/example/specs/feature/spec.md": "## Purpose\nFeature",
    "changes/draft/proposal.md": "Draft",
    "changes/archive/2026-10-01-old/tasks.md": "- [x] Done",
  };
  const state = { missing: false, failure: "" };
  const { bb, harness } = createFakePluginHost({
    pluginId: "openspec",
    experimental_callHostRpc: async ({ method, input }) => {
      if (state.failure) throw new Error(state.failure);
      const paths = Object.keys(documents);
      const ids = [
        ...new Set(
          paths.map(changeForPath).filter((id): id is string => id !== null),
        ),
      ];
      const changes = ids.map((id) => ({
        id,
        title: changeTitle(id),
        archived: id.startsWith("archive/"),
        artifacts: artifactsFor(paths, id),
        ...progress(parseTasks(documents[`changes/${id}/tasks.md`] ?? "")),
        error: null,
      }));
      if (method === "snapshot")
        return {
          changes: state.missing ? [] : changes,
          missing: state.missing,
          watchError: null,
        };
      if (method === "change") {
        const id = (input as { changeId: string }).changeId;
        const change = changes.find((c) => c.id === id);
        if (!change) throw new Error("Изменение не найдено");
        return {
          change,
          groups: parseTasks(documents[`changes/${id}/tasks.md`] ?? ""),
        };
      }
      return null;
    },
  });
  harness.sdk.stub("subscribe", () => () => {});
  const environment = {
    id: "env-1",
    projectId: "project-1",
    path: "/project",
    hostId: "host-1",
    status: "ready",
    lifecycle: { phase: "active" },
    name: null,
    branchName: null,
  };
  harness.sdk.stub("environments.get", async () => environment);
  harness.sdk.stub("hosts.pathsExist", async () => ({
    existence: { "/project/openspec": true },
  }));
  harness.sdk.stub("files.listPaths", async () => ({
    paths: Object.keys(documents).map((file) => ({ path: file, kind: "file" })),
    truncated: false,
  }));
  harness.sdk.stub(
    "files.read",
    async (input: { path: string; hostId: string; rootPath: string }) => {
      assert.equal(input.hostId, "host-1");
      assert.equal(input.rootPath, "/project/openspec");
      const relative = path.relative(input.rootPath, input.path);
      assert.ok(!relative.startsWith(".."));
      if (!(relative in documents)) throw new Error("ENOENT");
      return {
        content: documents[relative],
        contentEncoding: "utf8",
        sizeBytes: Buffer.byteLength(documents[relative]),
      };
    },
  );
  harness.sdk.stub("threads.list", async () => []);
  harness.sdk.stub("threads.spawn", async () =>
    makeThreadResponse({
      id: "new-thread",
      environmentId: "env-1",
      projectId: "project-1",
    }),
  );
  plugin(bb);
  return { bb, harness, documents, environment, state };
}

const target = { environmentId: "env-1", changeId: "example" };

test("reads active/archive progress and refreshes after agent changes", async () => {
  const { harness, documents } = setup();
  try {
    const read = async () =>
      rpcContract.changes.output.parse(
        await harness.behavior.callRpc("changes", { environmentId: "env-1" }),
      );
    const first = await read();
    assert.equal(first.changes.length, 3);
    assert.equal(
      first.changes.find((change) => change.id === "example")?.done,
      1,
    );
    assert.equal(first.changes.filter((change) => change.archived).length, 1);
    documents["changes/example/tasks.md"] =
      "- [x] 1.1 Read\n- [x] 1.2 Implement";
    assert.equal(
      (await read()).changes.find((change) => change.id === "example")?.done,
      2,
    );
    assert.equal(harness.inspection.sdk.callsTo("files.write").length, 0);
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("document reads reject traversal and files belonging to another change", async () => {
  const { harness } = setup();
  try {
    await assert.rejects(
      harness.behavior.callRpc("document", {
        ...target,
        path: "changes/draft/proposal.md",
      }),
      /Артефакт не найден/,
    );
    await assert.rejects(
      harness.behavior.callRpc("document", {
        ...target,
        changeId: "../private",
        path: "secret",
      }),
      /Недопустимый/,
    );
    assert.equal(harness.inspection.sdk.callsTo("files.read").length, 0);
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("launch reuses the selected environment, settings and edited prompt", async () => {
  const { harness } = setup();
  const execution = {
    providerId: "codex",
    model: "chosen",
    reasoningLevel: "high",
    permissionMode: "accept-edits",
    serviceTier: "default",
  };
  try {
    assert.deepEqual(
      await harness.behavior.callRpc("launch", {
        ...target,
        action: ACTION.APPLY,
        prompt: "Edited brief",
        execution,
      }),
      { threadId: "new-thread" },
    );
    const [spawn] = harness.inspection.sdk.callsTo("threads.spawn")[0] as [
      Record<string, unknown>,
    ];
    assert.deepEqual(spawn.environment, {
      type: "reuse",
      environmentId: "env-1",
    });
    assert.equal(spawn.projectId, "project-1");
    assert.equal(spawn.model, execution.model);
    assert.equal(spawn.permissionMode, execution.permissionMode);
    assert.match(String(spawn.prompt), /Edited brief/);
    assert.match(String(spawn.prompt), /changes\/example/);
    assert.deepEqual(spawn.pluginMetadata, target);
    assert.equal(spawn.visibility, "visible");
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("launch refuses draft implementation and archived changes without spawning", async () => {
  const { harness } = setup();
  try {
    await assert.rejects(
      harness.behavior.callRpc("launch", {
        ...target,
        changeId: "draft",
        action: ACTION.APPLY,
        prompt: "Do it",
        execution: null,
      }),
      /tasks.md/,
    );
    await assert.rejects(
      harness.behavior.callRpc("launch", {
        ...target,
        changeId: "archive/2026-10-01-old",
        action: ACTION.EXPLORE,
        prompt: "Do it",
        execution: null,
      }),
      /Архивное/,
    );
    assert.equal(harness.inspection.sdk.callsTo("threads.spawn").length, 0);
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("attachment only writes metadata and rejects another environment", async () => {
  const { harness } = setup();
  try {
    harness.sdk.stub("threads.get", async () =>
      makeThreadResponse({ environmentId: "other" }),
    );
    await assert.rejects(
      harness.behavior.callRpc("attach", { ...target, threadId: "thread" }),
      /того же окружения/,
    );
    harness.sdk.stub("threads.get", async () =>
      makeThreadResponse({ environmentId: "env-1" }),
    );
    harness.sdk.stub("threads.updatePluginMetadata", async () => target);
    assert.deepEqual(
      await harness.behavior.callRpc("attach", {
        ...target,
        threadId: "thread",
      }),
      { ok: true },
    );
    assert.equal(harness.inspection.sdk.callsTo("threads.send").length, 0);
    assert.equal(harness.inspection.sdk.callsTo("threads.spawn").length, 0);
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("package only uses the public SDK", async () => {
  const scan = await experimental_scanPublicSdkOnly(process.cwd(), {
    allow: [
      /^react(?:-dom)?$/,
      /^@radix-ui\/react-(?:slot|dialog|tooltip)$/,
      /^@\/components\/ui\/(?:button|input|icon|dialog|tooltip)$/,
      /^(?:class-variance-authority|clsx|tailwind-merge)$/,
    ],
  });
  assert.deepEqual(scan.violations, []);
  assert.deepEqual(scan.privateDependencies, []);
});

test("missing OpenSpec is distinct from an unavailable host", async () => {
  const { harness, state } = setup();
  try {
    state.missing = true;
    assert.deepEqual(
      await harness.behavior.callRpc("changes", { environmentId: "env-1" }),
      { changes: [], missing: true, watchError: null },
    );
    state.failure = "Machine offline";
    await assert.rejects(
      harness.behavior.callRpc("changes", { environmentId: "env-1" }),
      /Machine offline/,
    );
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("root-level notes are not changes and oversized documents fail explicitly", async () => {
  const { harness, documents } = setup();
  try {
    documents["changes/README.md"] = "Notes";
    const result = rpcContract.changes.output.parse(
      await harness.behavior.callRpc("changes", { environmentId: "env-1" }),
    );
    assert.equal(result.changes.length, 3);
    documents["changes/example/proposal.md"] = "x".repeat(512 * 1024 + 1);
    await assert.rejects(
      harness.behavior.callRpc("document", {
        ...target,
        path: "changes/example/proposal.md",
      }),
      /512/,
    );
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("reattachment persists across reads and invalidates both cards and thread context", async () => {
  const { bb, harness } = setup();
  const invalidations: string[][] = [];
  bb.rpc.experimental_invalidate = (tags) => {
    invalidations.push([...tags]);
  };
  let metadata = { environmentId: "env-1", changeId: "draft" };
  const thread = makeThreadResponse({
    id: "thread",
    environmentId: "env-1",
    projectId: "project-1",
  });
  harness.sdk.stub("threads.get", async () => thread);
  harness.sdk.stub("threads.list", async () => [thread]);
  harness.sdk.stub("projects.list", async () => []);
  harness.sdk.stub("environments.list", async () => []);
  harness.sdk.stub(
    "threads.updatePluginMetadata",
    async (input: { set: typeof metadata }) => {
      metadata = input.set;
      return metadata;
    },
  );
  harness.sdk.stub("threads.getPluginMetadata", async () => metadata);
  harness.sdk.stub("threads.experimental_listPluginMetadata", async () => ({
    threads: [{ threadId: "thread", metadata }],
  }));
  try {
    await harness.behavior.callRpc("attach", { ...target, threadId: "thread" });
    for (const changeId of ["draft", "example", "draft", "example"]) {
      const detail = rpcContract.detail.output.parse(
        await harness.behavior.callRpc("detail", { ...target, changeId }),
      );
      assert.equal(detail.threads.length, changeId === "example" ? 1 : 0);
    }
    const sources = rpcContract.sources.output.parse(
      await harness.behavior.callRpc("sources", { threadId: "thread" }),
    );
    assert.equal(sources.preferredChangeId, "example");
    const cards = rpcContract.changes.output.parse(
      await harness.behavior.callRpc("changes", { environmentId: "env-1" }),
    );
    assert.equal(
      cards.changes.find((c) => c.id === "example")?.threads[0]?.id,
      "thread",
    );
    assert.equal(
      cards.changes.find((c) => c.id === "draft")?.threads.length,
      0,
    );
    assert.deepEqual(invalidations.at(-1), [
      "openspec:threads:env-1",
      "openspec:changes:env-1",
      "openspec:binding:thread",
    ]);
    invalidations.length = 0;
    await harness.behavior.emitThreadEvent("thread.active", { thread });
    assert.deepEqual(invalidations.at(-1), [
      "openspec:threads:env-1",
      "openspec:changes:env-1",
    ]);
  } finally {
    await harness.lifecycle.dispose();
  }
});
