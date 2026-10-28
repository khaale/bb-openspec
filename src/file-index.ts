import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  artifactsFor,
  changeForPath,
  changeRelative,
  safeRelative,
} from "./change-paths";
import {
  changeTitle,
  parseTasks,
  progress,
  type Change,
  type TaskGroup,
} from "./model";
import { LIMITS } from "./limits";
import { errorMessage } from "./reader-error";

export type FileChange = { path: string; type: "create" | "delete" | "update" };
export type FileUpdate = {
  paths: string[];
  structural: boolean;
  rescan: boolean;
};
type Tasks = { groups: TaskGroup[]; error: string | null };

export async function exists(directory: string) {
  try {
    return (await stat(directory)).isDirectory();
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw cause;
  }
}

/** Volatile index owned by an active native watch, never persisted to disk. */
export class OpenSpecIndex {
  readonly root: string;
  private files = new Set<string>();
  private tasks = new Map<string, Tasks>();
  private summaries: Change[] = [];
  private missing = true;

  constructor(
    readonly workspacePath: string,
    private readonly onTaskRead?: (file: string) => void,
  ) {
    if (!path.isAbsolute(workspacePath))
      throw new Error("Требуется абсолютный путь окружения.");
    this.root = path.join(workspacePath, "openspec");
  }

  async initialize() {
    await this.update(null);
  }

  private async scan(): Promise<Set<string>> {
    if (!(await exists(this.root))) {
      this.missing = true;
      return new Set();
    }
    // Do not follow an OpenSpec symlink outside the selected workspace.
    const [workspaceRoot, actualRoot] = await Promise.all([
      realpath(this.workspacePath),
      realpath(this.root),
    ]);
    const relative = path.relative(workspaceRoot, actualRoot);
    if (
      relative.startsWith(`..${path.sep}`) ||
      relative === ".." ||
      path.isAbsolute(relative)
    )
      throw new Error("Каталог OpenSpec находится вне окружения.");
    this.missing = false;
    const files = new Set<string>();
    let entriesSeen = 0;
    const visit = async (directory: string, prefix: string) => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (++entriesSeen > LIMITS.paths)
          throw new Error(`В OpenSpec больше ${LIMITS.paths} записей.`);
        if (entry.isSymbolicLink()) continue;
        const name = safeRelative(
          prefix ? `${prefix}/${entry.name}` : entry.name,
        );
        if (entry.isDirectory())
          await visit(path.join(directory, entry.name), name);
        else if (entry.isFile()) files.add(name);
      }
    };
    await visit(this.root, "");
    return files;
  }

  private async readTasks(relative: string): Promise<Tasks> {
    try {
      this.onTaskRead?.(relative);
      const absolute = path.join(this.root, relative);
      const actual = await realpath(absolute);
      const actualRoot = await realpath(this.root);
      const inside = path.relative(actualRoot, actual);
      if (inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside))
        throw new Error("Задачи находятся вне OpenSpec.");
      if ((await stat(actual)).size > LIMITS.fileBytes)
        throw new Error(
          "Документ превышает 512 КиБ. Откройте его в редакторе.",
        );
      return {
        groups: parseTasks(await readFile(actual, "utf8")),
        error: null,
      };
    } catch (cause) {
      return { groups: [], error: errorMessage(cause) };
    }
  }

  async update(changes: readonly FileChange[] | null): Promise<FileUpdate> {
    const oldFiles = this.files;
    const structural =
      changes === null ||
      changes.some(
        (change) => change.type !== "update" || !oldFiles.has(change.path),
      );
    const nextFiles = structural ? await this.scan() : oldFiles;
    const ids = [
      ...new Set(
        [...nextFiles]
          .map(changeForPath)
          .filter((id): id is string => id !== null),
      ),
    ].sort();
    if (ids.length > LIMITS.changes)
      throw new Error(
        `Поддерживается до ${LIMITS.changes} изменений в окружении.`,
      );
    const nextTasks = new Map<string, Tasks>();
    for (let offset = 0; offset < ids.length; offset += 8) {
      await Promise.all(
        ids.slice(offset, offset + 8).map(async (id) => {
          const file = `${changeRelative(id)}/tasks.md`;
          if (!nextFiles.has(file)) return;
          const changed =
            changes === null ||
            changes.some(
              (change) =>
                file === change.path || file.startsWith(`${change.path}/`),
            );
          const cached = this.tasks.get(file);
          nextTasks.set(
            file,
            changed || !cached ? await this.readTasks(file) : cached,
          );
        }),
      );
    }
    this.files = nextFiles;
    this.tasks = nextTasks;
    this.summaries = ids.map((id) => {
      const task = nextTasks.get(`${changeRelative(id)}/tasks.md`);
      return {
        id,
        title: changeTitle(id.split("/").at(-1)!),
        archived: id.startsWith("archive/"),
        artifacts: artifactsFor([...nextFiles], id),
        ...progress(task?.groups ?? []),
        error: task?.error ?? null,
      };
    });
    return {
      paths: changes?.map((change) => change.path) ?? [],
      structural,
      rescan: changes === null,
    };
  }

  snapshot() {
    return { changes: this.summaries, missing: this.missing };
  }

  change(changeId: string) {
    changeRelative(changeId);
    const change = this.summaries.find(
      (candidate) => candidate.id === changeId,
    );
    if (!change) throw new Error("Изменение не найдено в выбранном окружении.");
    return {
      change,
      groups:
        this.tasks.get(`${changeRelative(changeId)}/tasks.md`)?.groups ?? [],
    };
  }
}
