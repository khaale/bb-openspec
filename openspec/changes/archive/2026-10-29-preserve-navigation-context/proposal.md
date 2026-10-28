## Why

Opening an environment-scoped Specs or Changes deep link resolves the correct project but does not save it as shared navigation context. In a fresh browser, switching to the other view can therefore select the first unrelated project.

## What Changes

- Remember the first resolved navigation context, including direct-link entry, without requiring a dropdown change.
- Wait for the requested environment instead of publishing a temporary fallback.
- Respect incoming shared selections and keep thread panels isolated from browser navigation context.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `capability-management/specification-browser`: establish shared navigation context when opening a direct environment link.

## Impact

Frontend context initialization and an installed-browser regression check. No new dependency, migration, source read/write behavior or public RPC change.
