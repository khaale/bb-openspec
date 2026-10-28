---
name: openspec-work
description: Work on linked OpenSpec changes or assign changes to BB agent threads; keep repository artifacts and task progress current.
---

# Linked OpenSpec work

Use this workflow when the thread is explicitly linked to an OpenSpec change.
Read the change path in the thread's first message or linked context. Work in
that thread's environment; do not substitute the project's other checkout.

1. Read project instructions and the available proposal, specs, design and
   tasks files under the linked change directory.
2. Follow the requested action: refine the planning artifacts, implement the
   pending tasks, or verify the implementation. Verification alone does not
   authorize changing source files.
3. When implementing, update task checkboxes in `tasks.md` after the work and
   its specified checks are complete. Keep unfinished tasks unchecked. If a
   decision blocks progress, ask the user and describe the blocker.
4. Keep the artifacts consistent with agreed scope. Report what changed,
   what was verified, and remaining work. Do not archive the change unless
   requested.

The plugin shows repository progress read-only and refreshes automatically.
There is no plugin command to mutate task status. Use the project's OpenSpec
workflow and ordinary file edits; use the OpenSpec CLI when installed and
appropriate to the project.

## Assign changes to threads

When the user has authorized delegation, a manager can use the plugin RPCs
through `bb plugin rpc call openspec <method> --input-file <json-file> --json`.
Use structured JSON files; never interpolate prompts into shell commands.

- `changes`: `{ "environmentId": "env_..." }` lists progress and linked threads.
- `launch`: `{ "environmentId": "env_...", "changeId": "change-name", "action": "apply", "prompt": "Implement this change and update tasks.md after checks.", "execution": null }` creates and starts a visible thread in the same environment with an automatic binding. Actions are `explore`, `apply`, `verify`; `execution: null` uses BB defaults. Returns `threadId`.
- `attach`: `{ "environmentId": "env_...", "changeId": "change-name", "threadId": "thr_..." }` assigns an existing thread from that environment without sending a message or starting work. This replaces its previous binding.
- `threadChoices`: `{ "environmentId": "env_..." }` includes each candidate's current `changeId`.

One thread has one current binding; a change may have several threads. Archive
changes cannot be assigned or launched. Assigning metadata alone does not direct
an already running turn: when changing the assignment, explicitly communicate
the new task through BB thread orchestration if authorized. Avoid assigning
concurrent edits of the same files to several agents.
