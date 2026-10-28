# Specifications browser — concept v2

Status: agreed interaction direction, captured in `openspec/changes/manage-specifications/`. Supersedes the multi-view v1 concept; no plugin runtime changes.

## One panel, two areas

A separate **Specifications** panel in the existing plugin shows a compact specification tree on the left and the selected document on the right. No map, dashboard, history page, or requirement-level navigation mode is needed for the initial version. On narrow screens, opening a file shows the document with a back action.

Build the tree from the union of `openspec/specs/**/spec.md` and `openspec/changes/<active-change>/specs/**/spec.md`, using the same relative capability path to combine entries. Archived change deltas do not introduce pending specifications. A repository without main specs still shows the structure found in its active changes.

Existing specifications are ordinary tree leaves. Use Git-style file decorations: a green document icon and A for a new specification, amber and M for a modified one, red and D for a specification explicitly pending removal. Unchanged icons stay muted. Tooltip and accessible labels describe the status; selection does not override its color. Removing some requirements marks the specification M, not D; mark those removals inside the document. Do not infer deletion of a whole specification from a REMOVED requirement block alone. The current example demonstrates A and M. Opening a leaf shows its complete specification and identifies its source change where relevant. When a main spec and a proposed version both exist, **Current / Proposed / Compare** controls in the document header switch how that one specification is read; they do not introduce separate navigation views. Do not silently combine competing deltas or invent a complete main spec when a delta needs a missing baseline; keep the relevant change identifiable.

## Hierarchy and completed refactor

Use OpenSpec's directory hierarchy, preserving full capability paths and arbitrary nesting. A directory may contain both its own `spec.md` and nested specifications. This is containment, not automatic requirement inheritance.

The completed refactor places current specifications and archived change deltas in three namespaces:

- `core`: `live-updates`, `store-sources`, `localization`, and `distribution`.
- `change-management`: `change-browser`, `task-checklist`, and `thread-context`.
- `capability-management`: reserved for the future specification browser and related specification behavior.

Current specs and archived change deltas now use these nested paths. The mockup illustrates the grouping; its main-source paths follow the completed move. The v1 mockup remains a historical design snapshot.

## Prototype

`docs/mockups/specifications-tree-v2.html` contains current repository content plus an explicitly labeled example change introducing a specification. The **Before first archive** checkbox is a prototype demonstration control outside the panel, not a proposed product mode. It demonstrates browsing change-only specifications when the main directory is empty.

## Confirmed platform support

SDK 0.6.79 permits multiple `navPanel` registrations per plugin, each with a unique ID and route. The current change panel can remain separate.

OpenSpec CLI 1.10.0 was verified in temporary fixtures: nested `core/live-updates` is discovered by its full relative path; a child returns its own requirements rather than inheriting the parent's; archiving a nested delta updates its corresponding file without changing the parent. See [recursive discovery](https://github.com/Fission-AI/OpenSpec/blob/main/src/utils/spec-discovery.ts) and [nested path support](https://github.com/Fission-AI/OpenSpec/pull/1355).

## Prototype verification

Verified the mixed current/proposed tree, a change-only tree before the first archive, opening a complete specification, Current / Proposed / Compare reading for an affected existing spec, and narrow-screen navigation back to the tree. At 390 px the prototype has no horizontal overflow.
