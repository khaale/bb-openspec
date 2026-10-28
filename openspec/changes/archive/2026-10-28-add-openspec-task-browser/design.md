## Context

See proposal.md and the agreed mockup at docs/mockups/openspec-browser-v2.html. The repository is new; bb with Plugin SDK 0.6.79 is installed. The source may be on any connected machine, and different environments for one project contain different files.

## Goals / Non-Goals

**Goals:** a standalone TypeScript/React plugin that uses the public SDK, standard bb components, and an existing environment to start threads.

**Non-Goals:** a custom task tracker, dependency on Tasks, editing files through the UI, a board, creating/archiving changes, new worktrees, running OpenSpec commands from the plugin, and custom artifact schemas in the first version.

## Decisions

- The plugin lives in the project root so its own openspec is available for validation. Create the scaffold with bb plugin new.
- Read files through bb.sdk.files with explicit hostId and rootPath for the selected environment. Read the standard structure proposal.md, design.md, tasks.md, specs/**/spec.md without depending on the OpenSpec CLI being installed on the server. The first version supports the standard spec-driven structure; user schemas are not interpreted as a fixed workflow.
- Parse the checklist separately from transport; account for Markdown fences and completion marked with x/X. The plugin does not modify repository content.
- The panel uses the project/environment from bb context, with an option to select them explicitly. When the source changes, stale asynchronous responses do not replace new data.
- While the panel is visible, refresh data every 5 seconds and on manual request. This captures agent changes without deploying a separate host worker solely for a filesystem watcher. Release the timer on unmount; do not poll a hidden page.
- Store the link in the thread's plugin metadata: environmentId and change ID. Do not copy change content or progress into a database. Linking does not start a turn.
- Start through threads.spawn in the existing environment, with plugin metadata and explicit user confirmation. Select provider/model/permission settings through standard SDK picker components routed to the environment; use defaults from bb.
- Render Markdown with the standard bb component. The UI uses theme tokens, Unicode statuses, and the density of the agreed mockup. Do not show explanatory notes about source or status interpretation on the main screen.

## Risks / Trade-offs

- Periodic reads create load → limit them to an open, visible panel and cap list/file sizes; allow manual refresh as needed.
- Large changes → show an explicit size-limit error instead of silently truncating a document; document the limits.
- Starting a new thread may lead to file changes → the form shows the first message and environment, while bb controls permission settings.
- Archived changes are available for viewing, but agent launch is disabled; do not infer a link between an archive and a former name.

## Migration Plan

Install the current directory locally after building and checking it. Rollback consists of disabling/removing the plugin; OpenSpec source files are not changed. The new version requires no data migration.
