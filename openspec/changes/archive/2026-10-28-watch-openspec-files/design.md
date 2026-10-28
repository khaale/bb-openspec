## Context

See proposal.md. SDK 0.6.79 provides host native watch, host → server signals, and experimental_whileWatched, whose lifetime ends when the last client disconnects. The first plugin version polls three read requests every 5 seconds.

## Goals / Non-Goals

**Goals:** eliminate idle I/O; read files on the project machine; separate file, document, and thread updates; release resources when panels close.

**Non-Goals:** background indexing of all projects, a persistent database/disk cache, invoking the CLI on every event, or changing praxis/lore data.

## Decisions

- The frontend switches changes/detail/document to standard experimental_useRpcQuery. Contract tags define targeted invalidation. The custom timer is removed.
- experimental_whileWatched(changes) controls the host watcher. Watchers share one index per working directory. A subscription ID enables safe cleanup across overlapping mount/unmount operations and RPC cancellation.
- Host native watch coalesces save events; the index stores the file list, parsed tasks, and summaries only while there are watchers. When a known tasks file changes, only that file is reread; structural changes rescan names while retaining results for unchanged tasks.
- Markdown document content continues to be read with rootPath confinement; the watcher invalidates only the changed document. Signals without a full list of paths trigger a rescan.
- If openspec is absent, watch its parent while excluding its other existing entries; when the directory appears, switch the watcher to it. This also covers deletion and recreation of the root.
- Thread statuses are invalidated through bb events. Metadata changes on linking are published explicitly. Worker exit/host reconnect restores only existing live subscriptions.
- Compare the CLI as an external process with telemetry disabled. Initial measurements: about 340–350 ms per call; status does not support archived changes. Therefore direct reads remain the only production reader, with no fallback CLI path or new dependency.

## Risks / Trade-offs

- File events may be missed → rescan-required and reconnect restore the state.
- The native watcher requires a ready machine → errors are shown through RPC; manual refresh remains available and periodic polling is not added.
- The archive may be large → existing limits remain, and unchanged tasks are not reread.
- Multiple environments may refer to one directory → the host index is shared by path, and invalidation is routed by each subscription's environmentId.

- The list shows task proportions and a green “✓ Completed” label when the checklist is nonempty and all tasks are done. This is the task status; the archive remains a separate category.
- Compact mode is stored in the interface localStorage: a card list, navigation to details, and a return action. Hidden details do not keep an unnecessary subscription.
- Relinking updates the tags for the list, details, and thread context source; the selector shows the previous change because a thread has one current link.
