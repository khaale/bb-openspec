# core/store-sources Specification

## Purpose
Defines selection of a local or registered OpenSpec planning source independently of the agent's code environment.

## Requirements

### Requirement: Resolve the Source Independently of the Execution Environment
The plugin SHALL resolve the source on the selected environment's machine through the public OpenSpec JSON CLI. Automatic selection SHALL follow context, including store-only and defaultStore; an explicit store SHALL be passed through --store. An explicit local selection SHALL read openspec/ in the selected environment.

#### Scenario: Store-Only Project
- **WHEN** the project config specifies a registered store and local planning directories are absent
- **THEN** automatic selection shows the store changes while keeping the code project as the execution environment

#### Scenario: Store-Optional Project
- **WHEN** local planning directories exist and the user explicitly selects a store
- **THEN** the browser reads the selected store instead of the local source

#### Scenario: Missing CLI or Invalid Store
- **WHEN** the store source cannot be resolved
- **THEN** the interface shows an error without replacing the selected store with the local source
- **AND** an ordinary local source with planning directories is available without the CLI

### Requirement: Read and Watch the Selected Source
The plugin SHALL read main specifications and artifacts for the selected change only within the resolved planning root. Content SHALL be read directly, without invoking the CLI for each file event. Watchers SHALL be shared by planning path and released when the last subscription closes. Manual refresh SHALL repeat discovery and restore watching at the new path.

#### Scenario: Shared External Store Changes
- **WHEN** several environments watch the same store and an agent modifies tasks.md
- **THEN** the panels receive current progress through a shared watcher
- **AND** reading the cached list and idle periods do not invoke the CLI

#### Scenario: Store Registration Changes
- **WHEN** the user changes the registration and clicks refresh
- **THEN** the source is resolved again and watching switches to the current path

#### Scenario: Read main specifications from an external store
- **WHEN** the selected planning source is an external store and the user opens a main specification
- **THEN** the document is read from the resolved store root on its host
- **AND** the code environment and unrelated planning sources are unchanged

### Requirement: Link Threads to a Planning Source
A link SHALL include environmentId, changeId, and the resolved storeId. Identical changeIds from different sources SHALL have independent thread lists. Existing links without storeId SHALL remain local.

#### Scenario: Start and Relink Across Sources
- **WHEN** the user starts or links a thread to a store change
- **THEN** metadata records the store, the thread panel restores it, and a local change with the same ID does not receive this link
- **AND** startup reuses the code environment and passes the planning path and --store to the agent

### Requirement: Compact Source Selector
The header SHALL show the current store in its collapsed context, and the expanded selector SHALL offer Auto, the local source, and registered stores. Viewing an external source file SHALL open it on the store host, not relative to the code checkout.

#### Scenario: Open a Store Document
- **WHEN** the user selects a store and opens an artifact
- **THEN** Markdown and file preview use the store path while the project/environment controls retain the execution context

### Requirement: Show Active and Recent Changes First
The change list SHALL place changes with an active thread first, then sort by artifact mtime in descending order. Alphabetical order SHALL be used only to break ties. Thread statuses and file events SHALL update the order without manual refresh.

#### Scenario: New Work Above Older Completed Changes
- **WHEN** a new change is created or an active agent is linked to it
- **THEN** it appears above older changes regardless of alphabetical name
