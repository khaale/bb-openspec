/** Compare the read-only projection with public OpenSpec archive in an isolated repository. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { projectSpecification, parseDelta } from "../src/specification-projection";
const exec = promisify(execFile);
const fixture = await realpath(await mkdtemp(path.join(tmpdir(), "bb-openspec-projection-")));
const env = { ...process.env, XDG_CONFIG_HOME: path.join(fixture, "config"), XDG_DATA_HOME: path.join(fixture, "data"), OPENSPEC_TELEMETRY: "0", DO_NOT_TRACK: "1" };
const requirement = (name: string, body = name) => `### Requirement: ${name}\nThe system SHALL ${body}.\n\n#### Scenario: ${name}\n- **WHEN** requested\n- **THEN** ${body}`;
const baseline = `# Fixture Specification\n\n## Purpose\nVerify the complete read-only projection against the public CLI.\n\n## Requirements\n\n${requirement("Keep ##")}\n\n${requirement("Old")}\n\n${requirement("Remove")}\n`;
const delta = `## RENAMED Requirements\n- FROM: \`### Requirement: Old\`\n- TO: \`### Requirement: New\`\n\n## MODIFIED Requirements\n${requirement("New", "replace the original scenario body").replace("Scenario: New", "Scenario: Old")}\n\n## REMOVED Requirements\n### Requirement: Remove\n**Reason**: superseded\n**Migration**: use Added\n\n## ADDED Requirements\n${requirement("Added")}\n`;
async function write(file: string, content: string) { const absolute = path.join(fixture, "openspec", file); await mkdir(path.dirname(absolute), {recursive:true}); await writeFile(absolute, content); }
try {
  await exec("openspec", ["init", "--tools", "none"], { cwd: fixture, env });
  await write("specs/core/nested/spec.md", baseline);
  await write("changes/fixture/.openspec.yaml", "schema: spec-driven\ncreated: 2026-10-28\n");
  await write("changes/fixture/proposal.md", "## Why\nVerify specification projection with a realistic isolated fixture.\n\n## What Changes\nRename, modify, remove and add requirements.\n\n## Capabilities\n### New Capabilities\n- `core/new`: new capability\n### Modified Capabilities\n- `core/nested`: supported operations\n\n## Impact\nTemporary files only.\n");
  await write("changes/fixture/tasks.md", "## Verification\n- [x] 1.1 Verify projection\n");
  await write("changes/fixture/specs/core/nested/spec.md", delta);
  const addition = `## ADDED Requirements\n${requirement("First")}`;
  await write("changes/fixture/specs/core/new/spec.md", addition);
  const projected = projectSpecification("core/nested", baseline, delta);
  assert.deepEqual(projected.issues, []);
  assert.equal(await readFile(path.join(fixture, "openspec/specs/core/nested/spec.md"), "utf8"), baseline);
  await exec("openspec", ["archive", "fixture", "--yes", "--json"], { cwd: fixture, env, timeout: 30_000 });
  // Compare full requirement blocks (including scenarios), not CLI-generated title/purpose.
  for (const [capability, expected] of [["core/nested", projected.proposed!], ["core/new", projectSpecification("core/new", null, addition).proposed!]]) {
    const actual = await readFile(path.join(fixture, `openspec/specs/${capability}/spec.md`), "utf8");
    const blocks = (text: string) => parseDelta(`## ADDED Requirements\n${text.slice(text.indexOf("### Requirement:"))}`).ADDED.map(block => block.markdown);
    assert.deepEqual(blocks(expected), blocks(actual));
  }
  console.log("PASS CLI archive agrees with nested add/modify/remove/rename projection and complete scenario replacement");
} finally { await rm(fixture, { recursive: true, force: true }); }
