---
name: openspec-work
description: Work on linked OpenSpec changes or assign changes to BB agent threads; keep repository artifacts and task progress current.
---

# Linked OpenSpec work

Use this workflow when the thread is explicitly linked to an OpenSpec change.
Read the change path and planning source in the thread's first message or linked context. Work in
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

## Store-backed changes

The execution environment remains the code checkout. Planning files may live in
an external registered store on the same host. Use the absolute planning root
from the launch context. For an attached store thread, resolve it with
`openspec context --store <id> --json`, then carry `--store <id>` through all
OpenSpec workflow commands. Never create a local duplicate of a store change.
References supplied by OpenSpec workflows are read-only upstream context.

RPC target inputs accept `storeId`: a string selects that registered store,
null explicitly selects the environment's local OpenSpec, and omission uses
OpenSpec's automatic root resolution. `planningSources` lists registered stores
for an environment. Changes return the resolved `source` (storeId/rootPath).
Launch and attach persist that resolved storeId in thread metadata. A thread
has one change/source binding, so reassigning to the same change id in a different
store still replaces the previous assignment. Missing storeId in old bindings
means local, preserving existing assignments.

After changing machine registration or project/default store selection, use
`refresh` with environmentId and the same storeId selection. This refreshes
root discovery and active watcher paths; ordinary file events do not run CLI.

## Read specifications

The navigation destinations are **OpenSpec · Changes** and **OpenSpec · Specs**.
Both are also available in the thread panel Actions menu. They share user-selected project/environment/planning source within the browser;
thread-embedded panels retain the thread's environment and binding.

Read-only RPCs accept the same environment/store selection:

- `specifications`: `{ "environmentId": "env_...", "storeId": null }` returns full capability paths, main references and active delta references, plus the resolved source. Archives are not pending deltas.
- `specification`: `{ "environmentId": "env_...", "storeId": null, "capabilityId": "core/example", "changeId": "change-name" }` returns readable main/delta sources, the proposed document, comparison blocks and unresolved issues. Omit changeId for main-only reading. One selected change is applied; simultaneous deltas are never merged.

Projection is a preview, not OpenSpec validation or approval to sync/archive.
Current/Proposed/Compare and tree status do not change repository files. New
capabilities can be read before the first archive; unsupported/conflicting
operations expose sources and diagnostics instead of a successful partial result.
