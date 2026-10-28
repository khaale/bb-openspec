import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Exercise the managed Git install build without installing or replacing a plugin.
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "bb-openspec-git-build-"));
const fixture = path.join(temporary, "plugin");
const excluded = new Set([".git", "node_modules", "dist", "coverage", ".env"]);
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: fixture,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited with ${result.status ?? result.signal}`);
}
try {
  await cp(root, fixture, {
    recursive: true,
    filter: (source) =>
      !path
        .relative(root, source)
        .split(path.sep)
        .some(
          (part) =>
            excluded.has(part) ||
            part.startsWith(".env.") ||
            part.endsWith(".log"),
        ),
  });
  run(process.platform === "win32" ? "npm.cmd" : "npm", [
    "install",
    "--omit=dev",
    "--omit=optional",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache",
    path.join(tmpdir(), "bb-openspec-npm-cache"),
  ]);
  run(process.env.BB_CLI || "bb", ["plugin", "build"]);
  const manifest = JSON.parse(
    await readFile(path.join(fixture, "package.json"), "utf8"),
  );
  for (const entry of ["server", "app", "host"]) {
    const metadata = JSON.parse(
      await readFile(path.join(fixture, `dist/${entry}.meta.json`), "utf8"),
    );
    if (
      metadata.pluginId !== "openspec" ||
      metadata.pluginVersion !== manifest.version
    ) {
      throw new Error(`Unexpected identity in ${entry} build metadata`);
    }
  }
  console.log(
    `PASS clean Git build: openspec@${manifest.version}, production dependencies only`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
