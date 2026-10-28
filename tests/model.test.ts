import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks, progress } from "../src/model.ts";
import {
  artifactsFor,
  changeRelative,
  safeRelative,
} from "../src/change-paths.ts";

test("groups, markers and fenced examples match the read-only checklist", () => {
  const groups = parseTasks(
    `- [ ] Before groups\n## 1. Read\n- [x] 1.1 Done\n- [ X ] 1.2 Also done\n- [~] 1.3 Pending\n- [] No number\n\n\`\`\`md\n- [ ] Example\n## Fake\n\`\`\`\n~~~\n- [x] Another example\n~~~\n## 2. Verify\n- [ ] 2.1 Check it\n`,
  );
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Задачи", "1. Read", "2. Verify"],
  );
  assert.deepEqual(progress(groups), { done: 2, total: 6 });
  assert.deepEqual(groups[1].tasks[0], {
    number: "1.1",
    title: "Done",
    done: true,
  });
  assert.equal(groups[1].tasks[2].done, false);
});

test("closing fences must match character, length and empty suffix", () => {
  const groups = parseTasks(
    "````md\n```\n- [x] example\n~~~~\n````suffix\n- [x] example\n````\n- [ ] actual",
  );
  assert.deepEqual(progress(groups), { done: 0, total: 1 });
});

test("only canonical active and archived change paths are accepted", () => {
  for (const invalid of [
    "../private",
    "/absolute",
    "a/../b",
    "a\\b",
    "a//b",
    "archive",
    "a/b",
    "archive/a/b",
  ]) {
    assert.throws(() => changeRelative(invalid));
  }
  assert.throws(() => safeRelative("a/./b"));
  assert.equal(
    changeRelative("archive/2026-10-28-complete"),
    "changes/archive/2026-10-28-complete",
  );
});

test("artifact discovery keeps capability paths within the selected change", () => {
  const result = artifactsFor(
    [
      "changes/a/proposal.md",
      "changes/a/specs/domain/auth/spec.md",
      "changes/ab/tasks.md",
      "changes/a/specs/notes.md",
    ],
    "a",
  );
  assert.deepEqual(result.find((item) => item.kind === "specs")?.paths, [
    "changes/a/specs/domain/auth/spec.md",
  ]);
  assert.deepEqual(result.find((item) => item.kind === "tasks")?.paths, []);
});

test("indented code examples are not tracked as tasks", () => {
  const groups = parseTasks(
    "    - [x] Indented code\n\t- [x] Tab code\n- [ ] 1.1 Real task",
  );
  assert.deepEqual(progress(groups), { done: 0, total: 1 });
});
