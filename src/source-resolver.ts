import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { z } from "zod";
import { exists } from "./file-index";
import { errorMessage } from "./reader-error";
import {
  storeIdSchema,
  type PlanningSource,
  type PlanningCatalog,
} from "./planning-source";

const exec = promisify(execFile);
export type RunOpenSpec = (args: string[], cwd: string) => Promise<unknown>;
const rootSchema = z.object({
  root: z.object({
    path: z.string().refine(path.isAbsolute),
    store_id: storeIdSchema.optional(),
  }),
});
const storesSchema = z.object({
  stores: z.array(z.object({ id: storeIdSchema })),
});

export const runOpenSpec: RunOpenSpec = async (args, cwd) => {
  try {
    const result = await exec("openspec", args, {
      cwd,
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY: "0", DO_NOT_TRACK: "1" },
    });
    return JSON.parse(result.stdout);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(
        "Для выбора stores установите OpenSpec CLI на машине окружения и добавьте openspec в PATH.",
        { cause },
      );
    const output = (cause as { stdout?: string }).stdout;
    if (output) {
      let diagnostic:
        { status?: { message?: string; fix?: string }[] } | undefined;
      try {
        diagnostic = JSON.parse(output);
      } catch {
        /* Non-JSON CLI errors retain the process error below. */
      }
      const message = diagnostic?.status
        ?.map((item) => [item.message, item.fix].filter(Boolean).join(" "))
        .join("\n");
      if (message) throw new Error(message, { cause });
    }
    throw new Error(`OpenSpec: ${errorMessage(cause)}`, { cause });
  }
};

/** CLI resolves beta configuration once; native reads and watches use the resulting root. */
export class SourceResolver {
  private roots = new Map<string, Promise<PlanningSource>>();
  private catalogs = new Map<string, Promise<PlanningCatalog>>();
  constructor(private readonly run: RunOpenSpec = runOpenSpec) {}

  resolve(
    workspacePath: string,
    storeId?: string | null,
  ): Promise<PlanningSource> {
    if (!path.isAbsolute(workspacePath))
      throw new Error("Требуется абсолютный путь окружения.");
    if (storeId === null)
      return Promise.resolve({ storeId: null, rootPath: workspacePath });
    if (storeId !== undefined) storeIdSchema.parse(storeId);
    const key = `${workspacePath}\0${JSON.stringify(storeId)}`;
    let pending = this.roots.get(key);
    if (!pending) {
      pending = this.resolveRoot(workspacePath, storeId).catch((cause) => {
        this.roots.delete(key);
        throw cause;
      });
      this.roots.set(key, pending);
    }
    return pending;
  }

  private async resolveRoot(
    workspacePath: string,
    storeId?: string,
  ): Promise<PlanningSource> {
    // Local planning directories win over store pointers in OpenSpec; keep this path CLI-free.
    if (
      storeId === undefined &&
      ((await exists(path.join(workspacePath, "openspec/changes"))) ||
        (await exists(path.join(workspacePath, "openspec/specs"))))
    )
      return { storeId: null, rootPath: workspacePath };
    const args = [
      "context",
      "--json",
      ...(storeId ? ["--store", storeId] : []),
    ];
    const { root } = rootSchema.parse(await this.run(args, workspacePath));
    return { storeId: storeId ?? root.store_id ?? null, rootPath: root.path };
  }

  catalog(workspacePath: string): Promise<PlanningCatalog> {
    let pending = this.catalogs.get(workspacePath);
    if (!pending) {
      pending = this.run(["store", "list", "--json"], workspacePath)
        .then((result) => ({
          stores: storesSchema.parse(result).stores,
          warning: null,
        }))
        .catch((cause) => ({ stores: [], warning: errorMessage(cause) }));
      this.catalogs.set(workspacePath, pending);
    }
    return pending;
  }

  clear(workspacePath?: string) {
    if (!workspacePath) {
      this.roots.clear();
      this.catalogs.clear();
      return;
    }
    for (const key of this.roots.keys())
      if (key.startsWith(`${workspacePath}\0`)) this.roots.delete(key);
    this.catalogs.delete(workspacePath);
  }
}
