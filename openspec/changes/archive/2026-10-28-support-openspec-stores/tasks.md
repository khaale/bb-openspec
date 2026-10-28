## 1. Exploration
- [x] 1.1 Study stores beta, the JSON CLI, and the existing read/watcher path; prepare the proposal/design/spec.

## 2. Implementation
- [x] 2.1 Add a host resolver through the CLI with caching and explicit errors; cover local/store-only/store-optional/default and refresh.
- [x] 2.2 Point the index, documents, and watcher at the selected planning root; preserve lifecycle and confinement.
- [x] 2.3 Add source identity to RPC and metadata, isolate links, and pass the correct context to the agent.
- [x] 2.4 Add a compact source selector and external file preview to the UI.

- [x] 2.5 Sort active threads first, then changes by artifact mtime; verify the order.

## 3. Verification
- [x] 3.1 Use automated tests to verify source isolation, errors, and watcher path changes.
- [x] 3.2 Verify the installed plugin with a local source and existing store without changing the store/registry.
- [x] 3.3 Update README/skill/changelog; run tests/typecheck/build and OpenSpec validation.
