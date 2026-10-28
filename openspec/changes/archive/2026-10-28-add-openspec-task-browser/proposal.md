## Why

OpenSpec stores changes, specifications, and checklists in the repository, but bb has no dedicated view for this data as tasks. The plugin will show progress and work context alongside agent threads; its own repository will be the first usage example.

Status: the first version is agreed; implementation follows this change's specifications.

## What Changes

In the first version:
- An OpenSpec panel for the selected project and checkout/environment, with a change list and search.
- A change card with proposal, specs, design, and tasks; missing artifacts are clearly indicated.
- A read-only checklist with groups and progress from tasks.md. The agent updates statuses and artifacts during work; the plugin displays the current state without manual editing.
- Reflect external file changes made by an agent or user.
- Link an existing thread to a change and open the context from the thread.
- Create and start a thread for a selected change: exploration, implementation, or verification. The first message can be edited and an agent selected before sending. The environment is inherited from the open change.
- Active and archived changes are available separately.

For discussion after the initial version: a board, creating and archiving changes through the interface, and a separate view of all tasks.md items.

## Capabilities

### New Capabilities


- `openspec-change-browser`: browse changes and their artifacts in the context of a project and environment.
- `openspec-task-checklist`: view task groups, their statuses, and progress without manual editing.
- `openspec-thread-context`: explicitly link a change to bb threads.

### Modified Capabilities

None: the directory was empty before the research began, with no existing specifications.

## Impact

A new standalone bb plugin with frontend/backend and, if needed for files on remote machines, a host entry. OpenSpec remains the source of content and progress; thread links are stored separately. No dependency on Tasks is planned.

The primary unit is a change with nested tasks; the checklist is read-only and uses Unicode indicators. Starting an agent creates a thread in the selected existing environment. The first version supports the standard spec-driven artifact structure. Mockup: docs/mockups/openspec-browser-v2.html; research: docs/research/bb-task-plugins.md.
