import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { SourceResolver, type RunOpenSpec } from "../src/source-resolver.ts";

test("auto resolution delegates store-only/default selection to CLI, explicit local bypasses it and store selection is cached", async () => {
  const calls: string[][] = [];
  let current = "/stores/first";
  const run: RunOpenSpec = async (args, cwd) => {
    assert.equal(cwd, "/code");
    calls.push(args);
    if (args[0] === "store") return { stores: [{ id: "team", root: current }] };
    return { root: { path: current, store_id: "team" } };
  };
  const resolver = new SourceResolver(run);
  assert.deepEqual(await resolver.resolve("/code"), {
    storeId: "team",
    rootPath: current,
  });
  assert.deepEqual(await resolver.resolve("/code", null), {
    storeId: null,
    rootPath: "/code",
  });
  const before = calls.length;
  await resolver.resolve("/code");
  assert.equal(calls.length, before);
  await resolver.resolve("/code", "team");
  assert.deepEqual(calls.at(-1), ["context", "--json", "--store", "team"]);
  await resolver.catalog("/code");
  await resolver.catalog("/code");
  assert.equal(calls.filter((args) => args[0] === "store").length, 1);
  current = "/stores/moved";
  resolver.clear("/code");
  assert.equal((await resolver.resolve("/code", "team")).rootPath, current);
  await resolver.catalog("/code");
  assert.equal(calls.filter((args) => args[0] === "store").length, 2);
});

test("local planning works without CLI but a selected or declared store never silently falls back", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openspec-source-"));
  const missingCli = new Error("Install OpenSpec CLI", {
    cause: Object.assign(new Error("not found"), { code: "ENOENT" }),
  });
  let calls = 0;
  const resolver = new SourceResolver(async () => {
    calls++;
    throw missingCli;
  });
  try {
    await mkdir(path.join(root, "openspec", "changes"), { recursive: true });
    assert.deepEqual(await resolver.resolve(root), {
      storeId: null,
      rootPath: root,
    });
    assert.equal(calls, 0, "local planning does not require any CLI version");
    await assert.rejects(resolver.resolve(root, "team"), /Install OpenSpec/);
    await rm(path.join(root, "openspec", "changes"), { recursive: true });
    resolver.clear(root);
    await assert.rejects(resolver.resolve(root), /Install OpenSpec/);
    assert.deepEqual(await resolver.catalog(root), {
      stores: [],
      warning: "Install OpenSpec CLI",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unknown stores, malformed CLI results and relative roots fail without widening file access", async () => {
  const failing = new SourceResolver(async () => {
    throw new Error("Unknown store 'missing'");
  });
  await assert.rejects(failing.resolve("/code", "missing"), /Unknown store/);
  const invalid = new SourceResolver(async () => ({
    root: { path: "../other" },
  }));
  await assert.rejects(invalid.resolve("/code", "team"));
  assert.throws(() => invalid.resolve("/code", "../../private"));
});
