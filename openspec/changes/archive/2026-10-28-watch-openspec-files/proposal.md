## Why

The five-second poll rescans OpenSpec and reads every tasks.md, including archived files, even when no files have changed. This creates unnecessary filesystem and network operations in large repositories and on remote machines.

## What Changes

- A native watcher on the environment machine, active only while at least one panel is watching data.
- One in-memory OpenSpec index per working directory; after an event, reread changed tasks.md files and reuse the other results.
- Update the interface through standard watched RPC reads and bb realtime invalidation instead of periodic polling.
- Thread statuses are updated through bb events and shown in the change list.
- The indicator on the left reflects the proportion of completed tasks; a thread link persists when switching changes and updates in all open views.
- Missed events, directory recreation, and reconnects trigger a reread of the current state; watch errors are visible to the user.
- Compare direct reads and the OpenSpec CLI on praxis and lore, reporting speed and data completeness. Do not add the CLI as a dependency unless measurements show an advantage.

## Capabilities

### New Capabilities

- `openspec-live-updates`: update watched data on file and thread events without periodic reads, manage watcher lifetimes, and restore the current state.

### Modified Capabilities

None. Existing change browsing and thread launch behavior remains; the new capability specifies how automatic updates work and their cost.

## Impact

The plugin gains a host entry and a temporary index on the project machine. Frontend/backend data queries change; source files and user statuses remain unchanged. Praxis and lore are used only for reads and benchmarking.
