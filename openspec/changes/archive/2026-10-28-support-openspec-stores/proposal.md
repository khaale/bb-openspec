## Why

The plugin currently reads only openspec/ in the selected checkout. In store-only projects, changes are in a separate registered store, so the browser shows an empty list and cannot correctly pass context to the agent.

## What Changes

- Separate the execution environment from the planning source: automatic OpenSpec selection, an explicit local source, or a registered store on the same machine.
- Resolve sources through the OpenSpec JSON CLI when opening/changing a source and on manual refresh, while retaining direct reads and a native watcher for content and progress.
- Pass the source through RPC, file preview, agent launch, and link metadata; identical change IDs from different stores remain separate.
- Show the source in the collapsed header and context selector; make registration/CLI errors available in the interface.
- Preserve repo-local mode without the CLI for ordinary local openspec/specs or changes.

## Capabilities

### New Capabilities

- `core/store-sources`: resolve OpenSpec sources, select stores, isolate links, and provide agent context.

### Modified Capabilities

None: previous capabilities are currently described in unarchived changes.

## Impact

Host RPC and index/watcher, backend RPC and thread metadata, frontend source/document/launch selection, tests, and documentation. The CLI is required for stores; no dependencies on internal OpenSpec modules are added. The plugin does not register stores, change user configs, or perform git sync. Worksets and browsing the shared upstream specs directory are outside this change; references remain context for standard CLI workflows.
