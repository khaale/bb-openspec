import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { OpenSpecIndex } from "../src/file-index";
import { parseTasks, progress } from "../src/model";

const exec = promisify(execFile);
const roots = process.argv.slice(2);
if (!roots.length)
  throw new Error("Pass repository paths; this benchmark only reads them.");
const cliEnv = { ...process.env, OPENSPEC_TELEMETRY: "0", DO_NOT_TRACK: "1" };
async function measured(run: () => Promise<unknown>) {
  const elapsed: number[] = [];
  let value: unknown;
  for (let index = 0; index < 7; index++) {
    const start = performance.now();
    value = await run();
    elapsed.push(performance.now() - start);
  }
  const warm = elapsed.slice(1).sort((a, b) => a - b);
  return {
    firstMs: +elapsed[0].toFixed(2),
    medianWarmMs: +((warm[2] + warm[3]) / 2).toFixed(2),
    minWarmMs: +warm[0].toFixed(2),
    value,
  };
}
for (const root of roots) {
  const openspec = path.join(root, "openspec");
  const entries = await readdir(path.join(openspec, "changes"), {
    withFileTypes: true,
  });
  const active = entries
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => entry.name);
  const archived = (
    await readdir(path.join(openspec, "changes/archive"), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => `archive/${entry.name}`);
  const all = [...active, ...archived];
  async function direct(ids: string[]) {
    let bytes = 0;
    const rows = await Promise.all(
      ids.map(async (id) => {
        const tasks = await readFile(
          path.join(openspec, "changes", id, "tasks.md"),
          "utf8",
        );
        bytes += Buffer.byteLength(tasks);
        return { id, ...progress(parseTasks(tasks)) };
      }),
    );
    return { rows, bytes };
  }
  const directAll = await measured(() => direct(all));
  const directActive = await measured(() => direct(active));
  const list = await measured(async () =>
    JSON.parse(
      (await exec("openspec", ["list", "--json"], { cwd: root, env: cliEnv }))
        .stdout,
    ),
  );
  let reads = 0;
  const initialIndex = await measured(async () => {
    const index = new OpenSpecIndex(root, () => reads++);
    reads = 0;
    await index.initialize();
    return { changes: index.snapshot().changes.length, taskReads: reads };
  });
  const liveIndex = new OpenSpecIndex(root, () => reads++);
  await liveIndex.initialize();
  const oneFile = await measured(async () => {
    reads = 0;
    await liveIndex.update([
      { path: `changes/${all[0]}/tasks.md`, type: "update" },
    ]);
    return { taskReads: reads };
  });
  const idleIndex = await measured(async () => {
    reads = 0;
    liveIndex.snapshot();
    liveIndex.change(all[0]);
    return { taskReads: reads };
  });
  const result: Record<string, unknown> = {
    repository: root,
    active: active.length,
    archived: archived.length,
    directAll,
    directActive,
    cliList: list,
    initialIndex,
    oneFile,
    idleIndex,
  };
  if (active[0]) {
    result.cliStatus = await measured(async () =>
      JSON.parse(
        (
          await exec("openspec", ["status", "--change", active[0], "--json"], {
            cwd: root,
            env: cliEnv,
          })
        ).stdout,
      ),
    );
    result.cliApply = await measured(async () => {
      const data = JSON.parse(
        (
          await exec(
            "openspec",
            ["instructions", "apply", "--change", active[0], "--json"],
            { cwd: root, env: cliEnv },
          )
        ).stdout,
      );
      return {
        tasks: data.tasks?.map((task: { id: string; done: boolean }) => ({
          id: task.id,
          done: task.done,
        })),
        progress: data.progress,
      };
    });
  }
  try {
    await exec("openspec", ["status", "--change", archived[0], "--json"], {
      cwd: root,
      env: cliEnv,
    });
    result.archivedStatus = "supported";
  } catch (cause) {
    result.archivedStatus = {
      supported: false,
      error: JSON.parse((cause as { stdout: string }).stdout),
    };
  }
  console.log(JSON.stringify(result));
}
