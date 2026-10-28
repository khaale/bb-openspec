import type { ComparisonBlock, ProjectionIssue } from "./specification-model";

type Heading = { line: number; level: number; title: string };
type Requirement = { name: string; markdown: string };
export const normalizeRequirementName = (name: string) => name.trim();
/** Only structural headings outside fenced/indented code participate in parsing. */
function headings(text: string) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const result: Heading[] = [];
  let fence: { char: string; length: number } | undefined;
  for (let line = 0; line < lines.length; line++) {
    const value = lines[line];
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(value);
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker) { fence = { char: marker[1][0], length: marker[1].length }; continue; }
    const match = /^ {0,3}(#{1,6})\s+(.+)$/.exec(value);
    if (match) result.push({ line, level: match[1].length, title: normalizeRequirementName(match[2]) });
  }
  return { lines, headings: result };
}
function requirements(text: string): { preamble: string; suffix: string; blocks: Requirement[]; issues: ProjectionIssue[] } {
  const parsed = headings(text);
  const blocks: Requirement[] = [];
  const issues: ProjectionIssue[] = [];
  let first = parsed.lines.length, lastEnd = parsed.lines.length;
  for (const [index, heading] of parsed.headings.entries()) {
    if (heading.level !== 3 || !/^Requirement:/i.test(heading.title)) continue;
    const name = normalizeRequirementName(heading.title.slice("Requirement:".length));
    const end = parsed.headings.slice(index + 1).find(h => h.level <= 2 || (h.level === 3 && /^Requirement:/i.test(h.title)))?.line ?? parsed.lines.length;
    if (blocks.length && heading.line > lastEnd) issues.push({ code: "structure", target: heading.title });
    first = Math.min(first, heading.line);
    lastEnd = end;
    if (!name || blocks.some(b => b.name === name)) issues.push({ code: "ambiguous", target: name });
    blocks.push({ name, markdown: parsed.lines.slice(heading.line, end).join("\n").trim() });
  }
  return { preamble: parsed.lines.slice(0, first).join("\n").trim(), suffix: parsed.lines.slice(lastEnd).join("\n").trim(), blocks, issues };
}
const operations = ["ADDED", "MODIFIED", "REMOVED", "RENAMED"] as const;
type Operation = typeof operations[number];
export function parseDelta(text: string) {
  const parsed = headings(text);
  const result: Record<Exclude<Operation, "RENAMED">, Requirement[]> = { ADDED: [], MODIFIED: [], REMOVED: [] };
  const renamed: { from: string; to: string }[] = [];
  const issues: ProjectionIssue[] = [];
  let purpose = "", sections = 0;
  const firstSection = parsed.headings.find(h => h.level === 2)?.line ?? Infinity;
  for (const heading of parsed.headings) if (heading.level === 1 && heading.line > firstSection) issues.push({ code: "structure", target: heading.title });
  const seen = new Set<string>();
  for (const [index, heading] of parsed.headings.entries()) {
    if (heading.level !== 2) continue;
    const end = parsed.headings.slice(index + 1).find(h => h.level <= 2)?.line ?? parsed.lines.length;
    const section = parsed.lines.slice(heading.line + 1, end).join("\n");
    if (/^Purpose$/i.test(heading.title)) { purpose = section.trim(); continue; }
    const operation = operations.find(op => heading.title.toLowerCase() === `${op} Requirements`.toLowerCase());
    if (!operation) { issues.push({ code: "structure", target: heading.title }); continue; }
    sections++;
    if (seen.has(operation)) issues.push({ code: "structure", target: heading.title });
    seen.add(operation);
    if (operation === "RENAMED") {
      // Parse FROM/TO only outside fenced examples, just as requirement headings.
      const clean = section.split("\n");
      let fenced: { char: string; length: number } | undefined, from: string | undefined;
      let pairs = 0;
      for (const line of clean) {
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (fenced) { if (marker && marker[1][0] === fenced.char && marker[1].length >= fenced.length && !marker[2].trim()) fenced = undefined; continue; }
        if (marker) { fenced = { char: marker[1][0], length: marker[1].length }; continue; }
        const match = /^ {0,3}-\s+(FROM|TO):\s*`?### Requirement:\s*(.*?)`?\s*$/.exec(line);
        if (!match) { if (line.trim() && !line.trim().startsWith("<!--")) issues.push({ code: "structure", target: line.trim() }); continue; }
        const name = normalizeRequirementName(match[2].replace(/`$/, ""));
        if (match[1] === "FROM") { if (from) issues.push({ code: "structure", target: from }); from = name; }
        else if (from && name) { renamed.push({ from, to: name }); from = undefined; pairs++; }
        else issues.push({ code: "structure", target: name });
      }
      if (from || !pairs) issues.push({ code: "structure", target: from ?? heading.title });
    } else {
      const parsedRequirements = requirements(section);
      issues.push(...parsedRequirements.issues);
      if (parsedRequirements.suffix || !parsedRequirements.blocks.length || parsedRequirements.preamble.replace(/<!--[\s\S]*?-->/g, "").trim()) issues.push({ code: "structure", target: heading.title });
      result[operation].push(...parsedRequirements.blocks);
      if (operation !== "REMOVED") for (const block of parsedRequirements.blocks) {
        if (!block.markdown.split("\n").slice(1).join("\n").trim()) issues.push({ code: "structure", target: block.name });
      }
    }
  }
  // A single change cannot both replace and remove the same identity, or
  // reuse either side of a rename. Never silently accept a last-write winner.
  const usedRenames = new Set<string>();
  for (const pair of renamed) {
    for (const name of [pair.from, pair.to]) {
      if (usedRenames.has(name)) issues.push({ code: "ambiguous", target: name });
      usedRenames.add(name);
    }
    if (result.REMOVED.some(item => item.name === pair.from || item.name === pair.to)) issues.push({ code: "ambiguous", target: pair.from });
  }
  for (const item of result.MODIFIED) {
    if (result.REMOVED.some(other => other.name === item.name) || result.ADDED.some(other => other.name === item.name)) issues.push({ code: "ambiguous", target: item.name });
  }
  if (!sections) issues.push({ code: "structure", target: "delta" });
  return { ...result, renamed, purpose, issues };
}
export function projectSpecification(capabilityId: string, main: string | null, delta: string | null) {
  const baseline = requirements(main ?? "");
  const issues = [...baseline.issues];
  const blocks: ComparisonBlock[] = [];
  if (delta === null) return { proposed: null, issues, blocks };
  const parsed = parseDelta(delta);
  issues.push(...parsed.issues);
  if (main === null && (parsed.MODIFIED.length || parsed.REMOVED.length || parsed.renamed.length)) issues.push({ code: "baseline", target: capabilityId });
  const next = baseline.blocks.map(block => ({ ...block, original: block.name }));
  const removed = new Set<string>();
  for (const { from, to } of parsed.renamed) {
    const target = next.find(block => block.name === from);
    if (!target) issues.push({ code: "missing", target: from });
    else if (next.some(block => block.name === to)) issues.push({ code: "duplicate", target: to });
    else {
      target.name = to;
      target.markdown = target.markdown.replace(/^ {0,3}###\s+Requirement:.*$/im, `### Requirement: ${to}`);
    }
  }
  for (const item of parsed.REMOVED) {
    const index = next.findIndex(block => block.name === item.name);
    if (index < 0) issues.push({ code: "missing", target: item.name });
    else { removed.add(next[index].original); next.splice(index, 1); }
  }
  for (const item of parsed.MODIFIED) {
    const target = next.find(block => block.name === item.name);
    if (!target) issues.push({ code: "missing", target: item.name });
    else target.markdown = item.markdown;
  }
  for (const item of parsed.ADDED) {
    if (next.some(block => block.name === item.name)) issues.push({ code: "duplicate", target: item.name });
    else next.push({ ...item, original: "" });
  }
  for (const before of baseline.blocks) {
    const after = next.find(block => block.original === before.name);
    blocks.push({
      name: after?.name ?? before.name,
      previousName: after && after.name !== before.name ? before.name : null,
      operation: removed.has(before.name) ? "removed" : after?.name !== before.name ? "renamed" : after?.markdown !== before.markdown ? "modified" : "unchanged",
      before: before.markdown, after: after?.markdown ?? null,
    });
  }
  for (const after of next.filter(block => !block.original)) blocks.push({ name: after.name, previousName: null, operation: "added", before: null, after: after.markdown });
  const preamble = main === null
    ? `# ${capabilityId} Specification\n\n${parsed.purpose ? `## Purpose\n\n${parsed.purpose}\n\n` : ""}## Requirements`
    : (baseline.blocks.length || /^ {0,3}##\s+Requirements\s*$/im.test(baseline.preamble)) ? baseline.preamble : `${baseline.preamble}\n\n## Requirements`;
  return { proposed: issues.length ? null : `${preamble}\n\n${next.map(block => block.markdown).join("\n\n")}${baseline.suffix ? `\n\n${baseline.suffix}` : ""}\n`, issues, blocks };
}

export function specificationIntroduction(markdown: string) { return requirements(markdown).preamble; }

export function specificationConclusion(markdown: string) { return requirements(markdown).suffix; }
