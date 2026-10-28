import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { safeRelative, changeRelative } from "./change-paths";
import { LIMITS } from "./limits";
import { pluginError } from "./plugin-error";
import { errorMessage } from "./reader-error";
import { parseDelta, projectSpecification } from "./specification-projection";
import { specificationPath, type SpecificationEntry, type SpecificationDocument } from "./specification-model";
import type { FileChange } from "./file-index";

export function validateCapabilityId(value: string) {
  safeRelative(value);
  if (/^[a-z]:/i.test(value)) throw pluginError("error.invalidPath");
  return value;
}
/** Specification content belongs to the source index; discovery and watching stay in core. */
export class SpecificationIndex {
  private cache = new Map<string, Promise<string>>();
  private summaries = new Map<string, { invalid: boolean; addedOnly: boolean; error: string | null }>();
  private revision = 0;
  private files = new Set<string>();
  constructor(private root: string, private onRead?: (path: string) => void) {}
  invalidate(files: Set<string>, changes: readonly FileChange[] | null) {
    this.revision++;
    this.files = files;
    for (const cached of new Set([...this.cache.keys(), ...this.summaries.keys()])) {
      if (!files.has(cached) || changes === null || changes.some(change => cached === change.path || cached.startsWith(`${change.path}/`))) { this.cache.delete(cached); this.summaries.delete(cached); }
    }
  }
  private entries() {
    const entries = new Map<string, SpecificationEntry>();
    for (const file of [...this.files].sort()) {
      const parsed = specificationPath(file);
      if (!parsed) continue;
      const entry = entries.get(parsed.id) ?? { id: parsed.id, mainPath: null, changes: [] };
      if (parsed.changeId === null) entry.mainPath = file;
      else entry.changes.push({ changeId: parsed.changeId, path: file, status: "unknown", error: null });
      entries.set(parsed.id, entry);
    }
    return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  private read(file: string) {
    let cached = this.cache.get(file);
    if (!cached) {
      cached = this.readFile(file);
      this.cache.set(file, cached);
      if (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
    }
    this.cache.delete(file); this.cache.set(file, cached);
    return cached;
  }
  private async readFile(file: string) {
    safeRelative(file);
    if (!this.files.has(file)) throw pluginError("error.artifactNotFound");
    const [root, absolute] = await Promise.all([realpath(this.root), realpath(path.join(this.root, file))]);
    const relative = path.relative(root, absolute);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw pluginError("error.outsideWorkspace");
    this.onRead?.(file);
    const handle = await open(absolute, "r");
    try {
      if (!(await handle.stat()).isFile()) throw pluginError("error.artifactNotFound");
      const buffer = Buffer.alloc(LIMITS.fileBytes + 1);
      let size = 0;
      while (size < buffer.length) {
        const { bytesRead } = await handle.read(buffer, size, buffer.length - size, size);
        if (!bytesRead) break;
        size += bytesRead;
      }
      if (size > LIMITS.fileBytes) throw pluginError("error.documentTooLarge");
      try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size)); }
      catch { throw pluginError("error.notUtf8"); }
    } finally { await handle.close(); }
  }
  async catalog() {
    const entries = this.entries();
    const pending = entries.flatMap(entry => entry.changes.map(change => ({ entry, change })));
    for (let offset = 0; offset < pending.length; offset += 8) await Promise.all(pending.slice(offset, offset + 8).map(async ({ entry, change }) => {
      let summary = this.summaries.get(change.path);
      if (!summary) {
        const revision = this.revision;
        try {
          const promise = this.read(change.path);
          const content = await promise;
          const delta = parseDelta(content);
          summary = { invalid: !!delta.issues.length, addedOnly: !delta.MODIFIED.length && !delta.REMOVED.length && !delta.renamed.length, error: null };
        } catch (cause) { summary = { invalid: true, addedOnly: false, error: errorMessage(cause) }; }
        // A concurrent invalidation removes the corresponding read promise.
        if (this.revision === revision) this.summaries.set(change.path, summary);
      }
      change.status = summary.invalid ? "unknown" : !entry.mainPath && summary.addedOnly ? "added" : "modified";
      change.error = summary.error;
    }));
    return entries;
  }
  async document(capabilityId: string, changeId?: string): Promise<SpecificationDocument> {
    validateCapabilityId(capabilityId);
    if (changeId) {
      changeRelative(changeId);
      if (changeId.startsWith("archive/")) throw pluginError("error.archivedReadOnly");
    }
    const entry = this.entries().find(entry => entry.id === capabilityId);
    if (!entry) throw pluginError("error.artifactNotFound");
    const chosen = changeId ? entry.changes.find(change => change.changeId === changeId) : undefined;
    if (changeId && !chosen) throw pluginError("error.artifactNotFound");
    const readErrors: SpecificationDocument["readErrors"] = [];
    const load = async (file: string) => {
      try { return { path: file, content: await this.read(file) }; }
      catch (cause) { readErrors.push({ path: file, message: errorMessage(cause) }); return null; }
    };
    const main = entry.mainPath ? await load(entry.mainPath) : null;
    const deltaContent = chosen ? await load(chosen.path) : null;
    const delta = deltaContent && chosen ? { ...deltaContent, changeId: chosen.changeId } : null;
    const projection = projectSpecification(capabilityId, main?.content ?? null, delta?.content ?? null);
    if (readErrors.length) { projection.proposed = null; projection.issues.push({ code: "baseline", target: capabilityId }); }
    return { capabilityId, main, delta, readErrors, ...projection };
  }
}
