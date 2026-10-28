# core/live-updates Specification

## Purpose
Keeps OpenSpec panels up to date when files and threads change, without periodically accessing the filesystem of an unchanged project.

## Requirements

### Requirement: Event-Driven Updates
OpenSpec data displayed in an open panel SHALL be updated after file events in the selected environment. The plugin MUST NOT periodically scan the directory or reread documents when there are no events or user requests. Frequent events from a single save operation SHALL be coalesced. Changes and Specifications consumers observing the same resolved planning path SHALL use one shared core event-coalescing and update-scheduling mechanism. Pending update work MUST NOT grow without bound from repeated events while previous updates are being processed. A sustained event stream SHALL allow updates to be delivered without waiting indefinitely for a quiet period. Feature panels MUST NOT introduce independent debounce pipelines for the same source.

#### Scenario: Unchanged Project
- **WHEN** the user leaves the panel open and no files change
- **THEN** the plugin performs no repeated file reads on a timer

#### Scenario: Agent Saves a Task
- **WHEN** an agent modifies tasks.md
- **THEN** the plugin updates the status and progress of the corresponding change without reading tasks.md for other changes

#### Scenario: Shared consumers receive one coalesced update stream
- **WHEN** Changes and Specifications panels observe the same planning source during a burst of saves
- **THEN** core coalesces and schedules the source events once for both consumers
- **AND** each panel receives its relevant updates without a separate panel-owned debounce timer

#### Scenario: Sustained events and slow processing
- **WHEN** repeated events arrive while an earlier source update is still being processed
- **THEN** pending work is coalesced rather than accumulating one obsolete update per event
- **AND** updates remain deliverable during the stream and reflect the latest state after it stops

#### Scenario: Independent planning paths
- **WHEN** two different planning paths receive events at the same time
- **THEN** each path has independently scheduled updates through the common core mechanism
- **AND** a burst on one path does not reset the debounce window of the other

### Requirement: Shared Watcher and Resource Cleanup
Panels for the same source SHALL share a watcher. After the last observing panel closes, the plugin SHALL release the watcher and its index. Closing one panel MUST NOT interrupt updates to the others.

#### Scenario: Two Panels
- **WHEN** two panels for the same environment are open and then one is closed
- **THEN** the remaining panel continues to receive updates through the shared watcher

### Requirement: Recovery and Errors
After missed events, reconnects, and changes to the OpenSpec structure, the plugin SHALL restore the current state. Creation, deletion, and recreation of the directory SHALL be reflected without restarting the plugin. Watch errors SHALL be visible to the user and SHALL allow a manual reread.

#### Scenario: Directory Recreated
- **WHEN** the OpenSpec directory is deleted and then recreated
- **THEN** the panel first shows that the directory is missing and then shows the new set of changes

### Requirement: Thread Updates
Changes to linked thread states SHALL be reflected through bb events without filesystem scanning.

#### Scenario: Agent Finishes a Turn
- **WHEN** a linked thread becomes idle
- **THEN** the panel updates its status without rereading tasks from files

### Requirement: Consistent Progress and Link Display
The change list SHALL show task progress proportionally and the state of the linked thread. A saved link SHALL persist when switching between changes and reopening the panel.

#### Scenario: Return to a Linked Change
- **WHEN** the user links a thread, opens another change, and returns
- **THEN** the original change shows the same linked thread and its current state

#### Scenario: Different Progress Levels
- **WHEN** one change has 8 of 8 tasks completed and another has 1 of 6
- **THEN** the progress bars show 100% and approximately 17%, with the corresponding counts beside them

### Requirement: Compact change list
The panel SHALL offer a persisted compact mode displaying only change cards, with navigation to details and back. Cards with nonzero task totals and all tasks done SHALL show an explicit completed label and green progress.

#### Scenario: Browse compact cards
- **WHEN** the user enables compact mode and opens a card
- **THEN** the panel displays that change's details with a return action to the card list
- **AND** reopening the panel retains the compact mode preference

### Requirement: Narrow panel header and active agent animation
The header SHALL keep project/environment controls and view actions usable at narrow panel widths. An active linked thread SHALL display an animated spinner beside its status, respecting reduced-motion preferences.

#### Scenario: Compact narrow panel with working agent
- **WHEN** a linked thread is active and the panel is 286 pixels wide
- **THEN** the header controls fit within the panel and the active card shows a spinner beside its working status

#### Scenario: Collapsed source controls
- **WHEN** the panel is opened
- **THEN** the header shows a compact source summary instead of project/environment selectors
- **AND** clicking the summary expands selectors, with Escape or another click collapsing them
- **AND** narrow panels show the project name while the full context remains available in a tooltip
