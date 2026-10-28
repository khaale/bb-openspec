## Context

OpenSpec stores beta supports --store, local planning directories, store:, and defaultStore. The source is resolved on the environment machine; registry paths from another machine do not apply. The plugin already separates server RPC and host entry, indexes files on the host, and uses native watch.

## Goals / Non-Goals

Goal: read and watch store changes and artifacts, and assign agents from the selected code environment. Do not create stores, environments, worktrees, worksets, or an additional task database.

## Decisions

- Local planning directories take precedence under OpenSpec rules and are resolved without the CLI. For other cases, use the public openspec context --json and store list --json commands through execFile (without a shell). For an explicit store, pass --store to context. The CLI validates the registration and store identity; do not copy beta registry/YAML formats.
- The resolver keeps results only in host worker memory so tasks.md events and thread status changes do not invoke the CLI. Manual refresh resets discovery/resolution. Changes to config/store registry require manual refresh; polling is not introduced.
- storeId: string means an explicit store; null means the environment's local openspec/; absence means automatic CLI resolution. For an ordinary local planning root, direct reads remain available when the CLI is absent.
- The source path comes only from the resolver, not the frontend. The index remains confined to the selected root; a document is checked to ensure it belongs to the change. An external document opens through host file preview, while the agent remains in the original execution environment.
- Metadata includes storeId. For existing links without storeId, the source is considered local: an already linked change must not silently switch to a store after config changes. New links record the resolved source.
- The watcher monitors the planning root; the previous index is released when the source changes. Multiple environments may share one store watcher. Invalidation may affect multiple sources in one environment, but each read retains its storeId and cached index.
- The prompt and configure context contain the absolute planning path, execution path, and --store for the workflow CLI. CLI references remain read-only context and are not assigned to the agent as change targets.

- Card order: active threads first, then changes by file mtime. The index caches timestamps and updates only affected paths; saving any artifact invalidates the order without reading other tasks.

## Risks / Trade-offs

The CLI runs during discovery/initial resolution, not on every data update. A missing CLI, unknown store, or stale registration is shown explicitly; the local source can be selected separately. The agent may need permission to access the external store directory: the plugin does not expand the sandbox or promise access, and identifies the planning root separately from the checkout.
