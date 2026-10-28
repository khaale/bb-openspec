## MODIFIED Requirements

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
