## 1. Research

- [x] 1.1 Check the SDK watcher/live-query lifecycle and compare the CLI with direct reads on praxis and lore; save a reproducible benchmark.
- [x] 1.2 Complete the comparison report for initial loading and updating one file after implementing the index.

## 2. Watch on the Project Machine

- [x] 2.1 Implement the index and incremental task updates; use tests to verify no reads during idle and reads only for the changed file.
- [x] 2.2 Add a native watcher, sharing, subscription cleanup, and root recreation; use tests to verify lifecycle and rescanning.

## 3. bb Integration

- [x] 3.1 Switch the backend/frontend to watched queries and targeted invalidation; verify file and thread events, panel closure, and reconnect.
- [x] 3.2 Update the documentation, run tests/typecheck/build/OpenSpec validation, and verify the installed plugin with real data without changing praxis/lore.

- [x] 3.3 Fix progress in the list and show the linked thread state; verify different completed-task ratios in the UI.
- [x] 3.4 Verify that a link persists when switching changes and reopening the panel, including updating all views after relinking.

- [x] 3.5 Add a compact card-list mode with navigation to details and an explicit completed-change state; verify the UI and persistence of the mode.
