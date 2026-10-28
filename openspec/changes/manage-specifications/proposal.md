## Why

The plugin shows proposed specifications inside individual changes but has no place to browse the system's existing and upcoming capabilities together. Users need a compact specification tree that also works before the first change is archived, with a readable document and a way to inspect proposed edits.

## What Changes

- Add a separate **Specifications** navigation panel in the existing plugin, leaving the Changes panel available.
- Build one recursive tree from main specifications and delta specifications in active changes. Show a capability once, including capabilities that exist only in a change.
- Open the complete selected specification beside the tree; on narrow panels, provide a back action to the tree.
- Provide **Current / Proposed / Compare** within the selected document, with an identified source change and read-only projection of its delta.
- Use theme-aware Git-style icon colors and A/M markers, with red removal styling inside the document. Do not infer deletion of an entire specification from removed requirements.
- Reuse planning-source selection, store isolation, native watching, read limits and localization. No editing, sync, archive, additional dashboard or relationship graph is added.

## Capabilities

### New Capabilities

- `capability-management/specification-browser`: a source-scoped tree of existing and proposed capabilities with document reading and compact navigation.
- `capability-management/specification-projection`: current/proposed/comparison reading using an explicitly selected change, including delta operations and unresolved-projection states.

### Modified Capabilities

- `core/store-sources`: allow reading main specifications as well as selected change artifacts within the resolved planning root.
- `core/live-updates`: share source-scoped debounce, maximum-wait handling and bounded update scheduling across Changes and Specifications consumers.

## Impact

Frontend navigation and document UI, server/host RPC, the shared file index and watcher invalidation, Markdown/delta parsing, typed message catalogs, tests and public documentation. The namespace refactor places existing specifications under `core` and `change-management`; new capability specifications belong under `capability-management`.

No new external service or account is required. Local specification browsing and projection retain direct file access without requiring the OpenSpec CLI. Store discovery continues using the existing CLI contract. The approved interaction direction is recorded in `docs/mockups/specifications-tree-v2.html`; its demonstration data is not product data or additional requirements.
