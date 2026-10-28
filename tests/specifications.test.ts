import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SpecificationIndex } from "../src/specification-index.ts";
import { OpenSpecIndex } from "../src/file-index.ts";
import { parseDelta, projectSpecification } from "../src/specification-projection.ts";

const requirement = (name: string, text = name) => `### Requirement: ${name}\nThe system SHALL ${text}.\n\n#### Scenario: ${name}\n- **WHEN** invoked\n- **THEN** ${text}`;
const main = `# Test\n\n## Purpose\nRead specs.\n\n## Requirements\n\n${requirement("A")}\n\n${requirement("B")}`;

test("projection applies add, rename plus modification, removal and complete scenario replacement", () => {
  const delta = `## RENAMED Requirements\n- FROM: \`### Requirement: A\`\n- TO: \`### Requirement: Renamed\`\n\n## MODIFIED Requirements\n${requirement("Renamed", "replace A")}\n\n## REMOVED Requirements\n### Requirement: B\n**Reason**: replaced\n**Migration**: use C\n\n## ADDED Requirements\n${requirement("C")}`;
  const result = projectSpecification("core/test", main, delta);
  assert.deepEqual(result.issues, []);
  assert.match(result.proposed!, /### Requirement: Renamed/);
  assert.match(result.proposed!, /replace A/);
  assert.doesNotMatch(result.proposed!, /### Requirement: [AB]\n|#### Scenario: A\n/);
  assert.match(result.proposed!, /### Requirement: C/);
  assert.deepEqual(result.blocks.map(block => block.operation), ["renamed", "removed", "added"]);
  assert.match(result.blocks[1].before!, /Requirement: B/);
});

test("new capabilities project without a baseline; missing, duplicate, ambiguous and unsupported operations stay unresolved", () => {
  const added = `## Purpose\nA new capability.\n\n## ADDED Requirements\n${requirement("A")}`;
  assert.match(projectSpecification("core/new", null, added).proposed!, /A new capability/);
  for (const [base, delta, code] of [
    [main, `## ADDED Requirements\n${requirement("A")}`, "duplicate"],
    [main, `## MODIFIED Requirements\n${requirement("Missing")}`, "missing"],
    [null, `## MODIFIED Requirements\n${requirement("A")}`, "baseline"],
    [main, `## UNKNOWN Requirements\n${requirement("C")}`, "structure"],
    [`${main}\n\n${requirement("A")}`, added, "ambiguous"],
  ] as const) {
    const result = projectSpecification("feature", base, delta);
    assert.equal(result.proposed, null);
    assert.ok(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues));
  }
});

test("fenced examples do not become operations; literal requirement names stay consistent with CLI; trailing main notes survive", () => {
  const delta = `## ADDED Requirements\n${requirement("C ##")}\n\n\`\`\`md\n## REMOVED Requirements\n### Requirement: A\n\`\`\``;
  const result = projectSpecification("feature", `${main}\n\n## Notes\nRetain this.`, delta);
  assert.deepEqual(result.issues, []);
  assert.match(result.proposed!, /Requirement: A/);
  assert.match(result.proposed!, /Retain this/);
  assert.equal(parseDelta(delta).REMOVED.length, 0);
  assert.equal(parseDelta(delta).ADDED[0].name, "C ##");
});

async function fixture() {
  const workspace = await mkdtemp(path.join(tmpdir(), "openspec-specs-"));
  const root = path.join(workspace, "openspec");
  const files = new Set<string>();
  const write = async (file: string, text: string) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text); files.add(file);
  };
  return { workspace, root, files, write, dispose: () => rm(workspace, { recursive: true, force: true }) };
}

test("catalog unifies nested current and active specs, excludes archives and does not inherit parent requirements", async () => {
  const f = await fixture();
  try {
    await f.write("specs/core/spec.md", main);
    await f.write("specs/core/child/spec.md", `## Requirements\n${requirement("Child")}`);
    await f.write("specs/other/child/spec.md", main);
    await f.write("changes/one/specs/core/child/spec.md", `## MODIFIED Requirements\n${requirement("Child", "updated")}`);
    await f.write("changes/two/specs/core/child/spec.md", `## ADDED Requirements\n${requirement("Other")}`);
    await f.write("changes/one/specs/new/capability/spec.md", `## ADDED Requirements\n${requirement("New")}`);
    await f.write("changes/archive/old/specs/archived/spec.md", `## ADDED Requirements\n${requirement("Old")}`);
    const index = new OpenSpecIndex(f.workspace); await index.initialize();
    const catalog = await index.specifications.catalog();
    assert.deepEqual(catalog.map(entry => entry.id), ["core", "core/child", "new/capability", "other/child"]);
    assert.equal(catalog[1].changes.length, 2);
    assert.equal(catalog[2].changes[0].status, "added");
    const doc = await index.specifications.document("core/child", "one");
    assert.match(doc.proposed!, /updated/);
    assert.doesNotMatch(doc.proposed!, /Requirement: A|Requirement: Other/);
    await assert.rejects(() => index.specifications.document("core/child", "absent"), /not found/);
    await assert.rejects(() => index.specifications.document("core/child", "archive/old"), /read-only/);
  } finally { await f.dispose(); }
});

test("document cache avoids idle/unrelated reads and refreshes only changed specs", async () => {
  const f = await fixture(); const reads: string[] = [];
  try {
    await f.write("specs/a/spec.md", main); await f.write("specs/b/spec.md", main);
    const index = new SpecificationIndex(f.root, file => reads.push(file)); index.invalidate(f.files, null);
    await index.document("a"); await index.document("b"); reads.length = 0;
    await index.catalog(); await index.document("a"); assert.deepEqual(reads, []);
    await f.write("specs/a/spec.md", "Updated"); index.invalidate(f.files, [{ path: "specs/a/spec.md", type: "update" }]);
    assert.equal((await index.document("a")).main?.content, "Updated"); await index.document("b");
    assert.deepEqual(reads, ["specs/a/spec.md"]);
  } finally { await f.dispose(); }
});

test("change-only reading works without CLI; errors keep the other source readable and confinement rejects traversal and symlinks", async () => {
  const f = await fixture();
  try {
    await f.write("changes/new/specs/core/new/spec.md", `## ADDED Requirements\n${requirement("New")}`);
    await f.write("specs/core/new/spec.md", main);
    const index = new SpecificationIndex(f.root); index.invalidate(f.files, null);
    for (const id of ["../core", "/core", "C:/core", "core\\new"]) await assert.rejects(() => index.document(id), /path/);
    await writeFile(path.join(f.workspace, "outside.md"), "outside");
    await rm(path.join(f.root, "specs/core/new/spec.md"));
    await symlink(path.join(f.workspace, "outside.md"), path.join(f.root, "specs/core/new/spec.md"));
    const partial = await index.document("core/new", "new");
    assert.equal(partial.main, null); assert.ok(partial.delta); assert.equal(partial.proposed, null);
    assert.match(partial.readErrors[0].message, /outside/);
    await rm(path.join(f.root, "specs/core/new/spec.md")); f.files.delete("specs/core/new/spec.md"); index.invalidate(f.files, null);
    assert.match((await index.document("core/new", "new")).proposed!, /Requirement: New/);
    await f.write("changes/new/specs/core/new/spec.md", "x".repeat(512 * 1024 + 1)); index.invalidate(f.files, null);
    assert.match((await index.document("core/new", "new")).readErrors[0].message, /512 KiB/);
  } finally { await f.dispose(); }
});

test("unsupported structure and conflicting operations never produce a silent partial projection", () => {
  for (const delta of [
    `## MODIFIED Requirements\n${requirement("A")}\n\n${requirement("A", "second")}`,
    `## MODIFIED Requirements\n${requirement("A")}\n\n## REMOVED Requirements\n### Requirement: A`,
    `## ADDED Requirements\n${requirement("C")}\n\n# Unsupported\nDropped text`,
    "## RENAMED Requirements\n- FROM: `### Requirement: A`\n- TO: `### Requirement: C`\n- FROM: `### Requirement: C`\n- TO: `### Requirement: D`",
  ]) {
    assert.equal(projectSpecification("core/test", main, delta).proposed, null);
  }
  assert.equal(projectSpecification("core/test", main, `## MODIFIED Requirements\n${requirement("A ##")}`).proposed, null);
  assert.match(projectSpecification("core/test", "# Empty\n\n## Purpose\nEmpty specification.", `## ADDED Requirements\n${requirement("New")}`).proposed!, /## Requirements/);
  const result = projectSpecification("core/test", main, `\uFEFF## added requirements\n${requirement("C").replace("Requirement:", "requirement:")}`);
  assert.deepEqual(result.issues, []);
  assert.match(result.proposed!, /requirement: C/);
});

test("archive reconciliation, two-change isolation and baseline/delta invalidation never write sources", async () => {
  const f = await fixture();
  try {
    await f.write("specs/a/spec.md", main);
    await f.write("changes/one/specs/a/spec.md", `## MODIFIED Requirements\n${requirement("A", "one")}`);
    await f.write("changes/two/specs/a/spec.md", `## MODIFIED Requirements\n${requirement("A", "two")}`);
    const index = new OpenSpecIndex(f.workspace); await index.initialize();
    const one = await index.specifications.document("a", "one");
    assert.match(one.proposed!, /SHALL one/); assert.doesNotMatch(one.proposed!, /SHALL two/);
    assert.match((await index.specifications.document("a", "two")).proposed!, /SHALL two/);
    const { readFile, rename } = await import("node:fs/promises");
    assert.equal(await readFile(path.join(f.root, "specs/a/spec.md"), "utf8"), main);
    await f.write("specs/a/spec.md", `${main}\n\n${requirement("Untouched")}`);
    await index.update([{path:"specs/a/spec.md",type:"update"}]);
    assert.match((await index.specifications.document("a", "one")).proposed!, /Requirement: Untouched/);
    await f.write("changes/one/specs/a/spec.md", `## MODIFIED Requirements\n${requirement("A", "latest")}`);
    await index.update([{path:"changes/one/specs/a/spec.md",type:"update"}]);
    assert.match((await index.specifications.document("a", "one")).proposed!, /SHALL latest/);
    await mkdir(path.join(f.root, "changes/archive"));
    await rename(path.join(f.root, "changes/one"), path.join(f.root, "changes/archive/one"));
    await index.update([{path:"changes/one",type:"delete"},{path:"changes/archive/one",type:"create"}]);
    assert.deepEqual((await index.specifications.catalog())[0].changes.map(item => item.changeId), ["two"]);
    await assert.rejects(() => index.specifications.document("a", "one"));
    assert.equal((await index.specifications.document("a")).delta, null);
  } finally { await f.dispose(); }
});
