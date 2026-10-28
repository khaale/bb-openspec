/** Integration smoke test; all CLI configuration and stores live under one temporary directory. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SourceResolver } from "../src/source-resolver";

const exec = promisify(execFile);
const fixture = await realpath(
  await mkdtemp(path.join(tmpdir(), "bb-openspec-stores-")),
);
const env = {
  ...process.env,
  XDG_CONFIG_HOME: path.join(fixture, "config"),
  XDG_DATA_HOME: path.join(fixture, "data"),
  OPENSPEC_TELEMETRY: "0",
  DO_NOT_TRACK: "1",
};
async function cli(args: string[], cwd = fixture) {
  return JSON.parse(
    (await exec("openspec", args, { cwd, env, timeout: 20_000 })).stdout,
  );
}
const resolver = new SourceResolver(cli);
try {
  const store = path.join(fixture, "shared");
  await cli([
    "store",
    "setup",
    "fixture-plans",
    "--path",
    store,
    "--no-init-git",
    "--json",
  ]);
  const code = path.join(fixture, "code");
  await mkdir(path.join(code, "openspec"), { recursive: true });
  await writeFile(
    path.join(code, "openspec/config.yaml"),
    "store: fixture-plans\n",
  );
  assert.deepEqual(await resolver.resolve(code), {
    storeId: "fixture-plans",
    rootPath: store,
  });
  console.log("PASS store-only config selects the external store");
  await mkdir(path.join(code, "openspec/changes"));
  resolver.clear(code);
  assert.deepEqual(await resolver.resolve(code), {
    storeId: null,
    rootPath: code,
  });
  assert.deepEqual(await resolver.resolve(code, "fixture-plans"), {
    storeId: "fixture-plans",
    rootPath: store,
  });
  console.log(
    "PASS local planning wins; explicit store overrides local planning",
  );
  const empty = path.join(fixture, "empty");
  await mkdir(empty);
  await exec("openspec", ["config", "set", "defaultStore", "fixture-plans"], {
    cwd: fixture,
    env,
  });
  assert.deepEqual(await resolver.resolve(empty), {
    storeId: "fixture-plans",
    rootPath: store,
  });
  console.log(
    "PASS defaultStore selects the external store outside local planning roots",
  );
  await assert.rejects(resolver.resolve(code, "not-registered"));
  console.log("PASS unknown store fails without local fallback");
} finally {
  resolver.clear();
  await rm(fixture, { recursive: true, force: true });
}
