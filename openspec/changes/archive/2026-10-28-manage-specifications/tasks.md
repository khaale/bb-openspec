## 1. Preparation

- [x] 1.1 Confirm the namespace mapping and SDK/OpenSpec constraints; verify the refactored main specs and archived delta paths.
- [x] 1.2 Complete proposal, delta specs, design and task breakdown; verify strict OpenSpec validation and consistency with the v2 interaction.

## 2. Source Reading and Live Catalog

- [x] 2.1 Add recursive main/active-delta discovery and the union tree model; test nested parent/child specs, matching leaf names, change-only sources, duplicate capability paths and exclusion of archived deltas.
- [x] 2.2 Add source-scoped document/catalog RPC and confined main/delta reads; test store isolation, traversal/symlink rejection, missing files and existing size/path limits.
- [x] 2.3 Extend the shared index/watch lifecycle for main specs and active deltas; verify targeted invalidation, no idle reads, unchanged-document cache reuse, root recreation and cleanup across both panels.

- [x] 2.4 Keep native debounce/max-wait and bounded pending-update scheduling in shared core, auditing current behavior before adding work; verify repeated saves, bulk multi-file changes and slow processing produce coalesced work, bounded pending updates and the latest final state without indefinite starvation. Verify Changes and Specifications share one source pipeline, different paths are independent, and no panel-owned debounce layer is introduced. Retain or tune timing from observed behavior.

## 3. Read-Only Projection

- [x] 3.1 Parse supported delta operations and derive one selected change's result; verify ADDED/MODIFIED/REMOVED/RENAMED, complete scenario replacement, rename plus modification, fences and normalized names against public CLI fixture results.
- [x] 3.2 Report unresolved operations without presenting a partial result as complete; test missing baselines/targets, duplicate additions, ambiguous names, unsupported content and continued access to readable sources.
- [x] 3.3 Produce Current/Proposed/Compare document data with explicit change identity; verify per-change isolation, visible removals, baseline/delta refresh, archive reconciliation and that reads never modify fixture files.

## 4. Specifications Panel

- [x] 4.1 Register the independent Specifications panel and compact searchable tree; verify existing Changes navigation, full capability paths, keyboard selection and browsing before the first archive.
- [x] 4.2 Add complete-document reading and applicable Current/Proposed/Compare controls with a compact change-source selector; verify new-spec states, Git-style icon/status accessibility, narrow-panel back navigation and retained selection.
- [x] 4.3 Add typed English/Russian messages and error presentation; verify catalog completeness, live language switching and preservation of repository text and reading selection.

- [x] 4.4 Add the Specs action tab beside Changes in thread panels; verify thread context, narrow reading and that selecting capabilities stays inside the thread.

## 5. Integration and Delivery

- [x] 5.1 Verify the installed plugin with local and store-backed sources; check real tree/document behavior, proposed edits, file-event refresh and narrow layouts while retaining the current change-browser behavior.
- [x] 5.2 Update README, overview and real English screenshots; run npm run check, npm run verify:git-build, relevant store integration checks and strict OpenSpec validation, and record results.
