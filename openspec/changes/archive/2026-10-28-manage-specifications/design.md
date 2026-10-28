## Context

The current app registers one navigation panel and a thread tab. The server resolves the selected planning source on its host; a shared native watcher and an in-memory index already discover files under the OpenSpec root. The index currently summarizes changes and task progress, while document reads are restricted to change artifacts. Main specs now use nested paths under `core` and `change-management`.

OpenSpec CLI 1.10.0 supports nested main and delta capability paths. The spec format uses requirement headings as operation targets rather than stable requirement IDs. Local planning currently works without the CLI; store discovery uses its public JSON commands. See the proposal for motivation and the v2 mockup for the agreed interaction.

## Goals / Non-Goals

**Goals:** one compact tree and document reader; browsing before the first archive; source-scoped, read-only delta projection; continuity with current watcher, localization, and path isolation.

**Non-Goals:** editing specifications, creating or archiving changes from this panel, agent launch controls, automatic sync, combining several changes, semantic relationship graphs, task/test/approval dashboards, or automatic requirement inheritance.

## Decisions

### A second panel in the same plugin

Register `specifications` through `app.slots.navPanel` and keep existing `openspec` routes unchanged. Name the destinations `OpenSpec · Changes` and `OpenSpec · Specs`; use ListTodo and a registered book icon (BookOpen is not a built-in in bb 0.47.1). Navigation panels share user-selected project/environment/source context through browser storage and storage/custom events, without timers. Thread panels retain their own binding and environment. Reuse source selection and translation context. Keep one package. Also register an action tab for Specs in thread panels, as requested after the initial implementation; it uses the thread environment and binding source. Selecting a specification inside that tab stays in the thread rather than navigating to the standalone page. The SDK permits multiple panel registrations; no arbitrary split-placement API is assumed.

Use the v2 tree/document layout. Current, Proposed, and Compare affect only the selected document. Show these controls when meaningful; a new capability opens its proposed content and explains the unavailable current version. When multiple active changes affect an entry, use a compact source selector in the document header. Do not create another overview or history screen. Narrow panels use the existing card-list pattern of selecting content and returning, applied to tree/document navigation.

### A recursive union keyed by full paths

Discover `specs/**/spec.md` and `changes/<active-change>/specs/**/spec.md`; do not include archived deltas as pending work. A catalog entry combines a main-file reference and its active delta references using the full normalized capability path. Keep source identity in every request and cache key. Construct folder nodes recursively: a node can have its own spec and children, or children only. Do not hardcode the three current namespaces or flatten the last path segment.

Keep catalog discovery separate from full-document reads. Reuse the current file index rather than adding a separate scanner, database, or poller. Cache bounded delta summaries to decorate affected leaves. Parse a document or changed summary only when needed, and retain it only while the observed source is in use. A missing main directory is a normal change-only source, not an error.

### Direct parsing and a pure read-only projection

Keep local browsing independent of the OpenSpec CLI. Parse the documented structural Markdown sections and requirement operations in a bounded, plugin-local reader. Do not import OpenSpec internals or add its npm package. Use public CLI JSON output and archive results on temporary fixtures as conformance evidence, not a production fallback that creates a second parser path.

Projection accepts one baseline and one selected delta. Match capability paths and normalized requirement headings using OpenSpec conventions, using trimmed, case-sensitive names as the public CLI does (including any literal closing-heading markers). Respect fenced code so examples do not become requirements or operations. ADDED introduces new blocks; MODIFIED replaces complete blocks including scenarios; REMOVED excludes a target from the result while keeping its previous text for comparison; explicit RENAMED instructions map old and new names, including a rename paired with modification. Unchanged blocks retain their baseline order; apply insertion/order rules consistently with OpenSpec fixtures.

Unknown structure, duplicate additions, missing targets, ambiguous names, or an unavailable required baseline produce explicit unresolved-operation records. Do not fabricate a successful complete projection. Preserve readable baseline and raw delta content as separate inspectable sources in that state. Missing main content is valid for applicable ADDED-only new capabilities. Scenario-loss validation warnings must remain distinguishable from showing what a replacement block actually contains; a preview is not approval to archive.

An explicit source-change selection prevents silently merging simultaneous changes. Reuse the selection while its source exists; reconcile it after archive/removal. Projection results are derived caches, never persisted spec copies.

### Document rendering and Git-style status

Render complete current/proposed Markdown through the existing bb renderer. Compare uses requirement/scenario-level before/after blocks with additions and removals distinguished, without adding a third navigation column. Keep source names visible; retain the capability selection when changing the reading mode.

A means a capability introduced without a main spec; M means an existing capability with a pending delta. Use theme-aware green/amber icons, letters, tooltips, and accessible labels; selected-row styling must not override status color. Red marks removed requirement content in Compare. OpenSpec REMOVED blocks remove requirements, not entire files: do not produce a red D capability merely because a delta contains removals or leaves zero requirements. Whole-capability deletion is not introduced by this change. Unreadable or invalid deltas retain their source identity and expose a diagnostic rather than masquerading as unchanged content.

### Extend current source and watch contracts

Add catalog/document/projection RPC contracts using the existing environment and store selection. Resolve sources on the host, as today. Accept validated capability and change identities rather than arbitrary filesystem paths; enforce root confinement and source ownership on main and delta reads just as on current artifact reads. Preserve the existing 4000-entry and 512-KiB document bounds and explicit-limit errors.

Extend the current watcher/index lifecycle so a main-spec or active-delta edit invalidates its catalog summary, document and affected projection; a structural event updates the union. Unrelated documents retain their cache entries. Panels observing the same source share the watcher, and closing one panel does not interrupt the other. Idle sources do not cause timer reads or CLI calls. Failed reads do not erase a usable tree.

### One core event-coalescing and scheduling mechanism

Debounce, maximum-wait handling, dirty-path coalescing and pending-update scheduling belong to `core/live-updates`. Reuse the shared watcher pool (currently `src/watch-pool.ts`) as the owner, with one pipeline per resolved planning path and independent state for different paths. Changes and Specifications consume that pipeline; do not introduce feature-owned debounce wrappers. Core publishes affected paths and rescan/structural flags, while feature-specific query tags remain a downstream concern.

The existing watcher passes `debounceMs: 120` and `maxWaitMs: 700` to the SDK. The first is a quiet period for coalesced delivery; the second bounds how long a native batch waits. Neither bounds end-to-end document freshness when indexing, projection or delivery is slow. `WatchPool.enqueue` serializes delivered batches but does not itself merge pending work.

Before increasing work per event, exercise repeated saves, bulk multi-file changes, and a sustained event stream with deliberately slow processing. Measure delivered batches, index/projection work and pending updates; verify that the final state is retained and active streams are not postponed indefinitely. If backlog appears, merge pending dirty paths and structural/rescan flags into bounded pending work rather than replaying every obsolete intermediate update. Preserve targeted invalidation and resource cleanup. Reuse or tune the SDK's debounce and max-wait first; add another timer only if measurements justify it.

## Risks / Trade-offs

- **Projection diverges from OpenSpec behavior** → keep structural parsing narrow, use real-format conformance fixtures for all operations and combined rename/modify, and report unsupported/ambiguous content explicitly.
- **Users mistake a proposal for the current contract** → label the selected change and reading mode, keep Current available when it exists, and never treat colors as completion or approval.
- **Several deltas compete for one capability** → show their source choices and project only one; multi-change conflict resolution is outside this change.
- **Nested discovery or external-store access escapes the intended source** → validate full paths, keep current symlink/root rules, and test same-name capabilities across branches and stores.
- **Large archives increase discovery cost** → reuse the existing bounded index; archived specs do not add pending parsing/projection work.

## Migration Plan

The namespaced spec refactor is already prepared separately from this feature. No metadata or task-state migration is required. Implement and verify the new read paths and projection first, then add the second panel and its translations. Update overview/readmes and real screenshots after verifying the installed plugin. Disabling or rolling back the feature leaves all repository files and the current change browser intact.

## Preparation Checks

The namespace refactor retains exact requirement blocks in all seven main specs and their archived deltas; archived task content and completion marks are unchanged. Strict main-spec validation passed 7/7, archived task validation passed 5/5, and the five archived changes also passed strict delta validation in an isolated active-change fixture.

The new change passes strict validation and exposes thirteen operations: eleven ADDED requirements and two MODIFIED requirements. A separate temporary fixture applied it to the namespaced baseline using archive; the resulting nine main specifications passed strict validation. Only the fixture's task marks were set complete for that archive compatibility check. In the real change, implementation tasks remain pending.
