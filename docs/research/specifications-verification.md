# Specifications panel verification

Verified on 2026-10-28 with bb 0.47.1, Plugin SDK 0.6.79, Node 24.20.0 and OpenSpec CLI 1.10.0. Plugin version: 0.5.0.

## Implementation

The source-owned OpenSpec index now discovers main and active delta specifications by full relative capability path. Specifications and Changes share its native watcher and update scheduling. Main/delta reads enforce the selected root, discovered paths, realpath confinement, UTF-8 and the existing 512 KiB limit. Documents use a 32-entry content cache; active delta summaries are cached separately within the bounded source index. No runtime dependency was added.

The pure projection applies one selected change. Requirement identity follows CLI case-sensitive trimmed names; canonical requirement blocks retain complete scenarios. Add/modify/remove/rename and combined rename/modify are supported. Unknown structure, missing/duplicate/ambiguous targets and unavailable required baselines prevent a successful partial result. Readable sources remain available. Projection does not run validation or write files; CLI archive may reject scenario loss even though the preview correctly shows the replacement block.

## Automated evidence

- `npm run check`: typecheck, 40 tests and all three plugin bundles pass.
- `npm run verify:git-build`: a temporary production-dependency-only copy builds server/app/host with matching openspec@0.5.0 identity.
- `npm run test:specifications`: public CLI archive in an isolated initialized fixture agrees with full requirement blocks for nested capabilities, an added-only capability, all four operations, rename plus modification and scenario-body replacement. A literal closing-heading marker is retained in a requirement identity. The fixture and its private CLI configuration are removed afterwards.
- `npm run test:stores`: isolated store discovery/default/local override checks pass, including identical nested capability paths reading different local/store documents.
- `openspec validate --all --strict --no-interactive`: seven current specs and manage-specifications pass.
- Namespace integrity check: all seven main requirement sections match their pre-refactor versions byte-for-byte; all five archived task lists remain complete.

Focused tests cover recursive union discovery, parent plus child specs, matching leaves in different branches, change-only sources, archived-delta exclusion and archive reconciliation. They verify per-change isolation, baseline/delta invalidation, no idle/unrelated reads, read-only source preservation, unsupported/conflicting operations, fenced examples, traversal/symlink rejection and document size limits. Existing watcher tests exercise missing/recreated roots, shared subscription cleanup and recovery.

The slow-consumer stress test holds one source's delivery open, sends 300 repeated saves plus 60 distinct newly created spec paths, and observes exactly two deliveries for that source: one running batch and one coalesced pending batch. All 60 specs and the latest task state are retained. A second source updates before the blocked delivery is released; closing one of two consumers keeps the shared watch alive. SDK watch options remain debounceMs=120 and maxWaitMs=700. This test verifies core scheduling and the configured native batching contract, not a universal end-to-end latency guarantee.

## Installed plugin checks

- Two distinct destinations, OpenSpec · Changes (task list) and OpenSpec · Specs (registered book icon). BookOpen is unavailable as a built-in in this bb version, so a plugin-scoped icon is registered through the public SDK.
- Local tree shows seven current capabilities plus two new capabilities from the active change, with A/M decorations. Complete documents render in Current/Proposed/Compare; a new capability has Current disabled and opens Proposed.
- English/Russian switching preserves capability and Compare mode; repository text stays unchanged. Automatic language selection was restored after checking.
- At 320 px, the tree opens a document with back navigation and no horizontal overflow.
- The real registered magma-agent-toolkit store renders its nested union tree, including change-only capabilities, multiple source choices and readable unresolved operations. No store files were modified.
- Two browser pages verify shared context: a store selected in Specs is inherited by Changes; switching Changes to Local updates the already-open Specs page via browser storage events. Thread panels retain their own binding behavior.
- A temporary marker added to a local main spec appears in the open Proposed document through native file events without refresh. Restoring the exact original bytes removes it. Both panels were open during this check.
- Real English specification screenshots show the tree with Compare in docs/screenshots/specifications.jpg and the narrow thread tab in docs/screenshots/specifications-narrow.jpg. The user-provided simultaneous Changes/Specs view is saved as docs/screenshots/changes-and-specs.png. Both READMEs include these images. Existing Changes full/narrow screenshots remain; there is no redundant compact-list screenshot.

These checks do not publish a release, push Git, submit to the marketplace, sync main specifications or archive the active feature change.

## Thread Specs follow-up

Both views are registered as thread panel actions. The installed Specs tab was opened in thr_h5ymybwr4r; its tree uses the thread environment. Selecting core/live-updates opens the narrow reader while the URL remains on the thread. The thread variant deliberately omits standalone-page navigation on capability selection. Typecheck, all bundles and strict change validation pass after this addition.
