# Changelog

These versions record local development; they do not imply public releases.

## 0.5.0 — 2026-10-28

- Separate OpenSpec · Specs panel with a searchable recursive tree of current and active-change specifications.
- Read-only Current / Proposed / Compare, explicit change source, Git-style status and diagnostics for unresolved operations.
- Consistent Changes/Specs names, distinct icons and shared navigation planning context.
- Unified watcher pipeline with bounded pending event coalescing, shared caches and targeted specification invalidation.
- Specification namespaces reorganized into core, change-management and capability-management.
- English/Russian messages, narrow tree/document navigation, documentation and CLI projection conformance checks.

## 0.4.0 — 2026-10-28

- English, Russian and automatic browser-language selection through plugin settings.
- Live UI language changes preserve the selected change and edited launch prompt; typed catalogs, translated plugin errors and Intl counters.
- English launch templates and agent context, independent of UI locale.
- Git distribution preparation: MIT license, English and Russian documentation, CI and a clean production-dependency build check.
- SDK runtime helpers available during production-only Git builds.

## 0.3.0 — 2026-10-28

- OpenSpec stores beta: automatic discovery, explicit local source and registered stores on the environment machine.
- Independent planning roots and code environments; documents, watchers and thread bindings respect the selected source.
- Store context and `--store` in agent launch prompts; existing local bindings retained.
- Working agents first, followed by recently modified artifacts.
- Isolated integration checks using the OpenSpec CLI: `npm run test:stores`.

## 0.2.0 — 2026-10-28

- Shared native watchers and an incremental host index replace periodic file rereading.
- Reconnect recovery, plugin reload reconciliation and resource cleanup.
- Proportional task progress and explicit completion status on cards.
- Linked thread status and a slow animated working indicator.
- Binding updates reflected across views and thread context.
- Compact cards, collapsible context selection and icon tooltips.
- Direct file reading and OpenSpec CLI benchmarks on praxis and lore.

## 0.1.0 — 2026-10-28

- Active and archived OpenSpec change browser with read-only artifacts and checklists.
- Launch and attach agent threads in a selected environment.
- Navigation and thread panels.
