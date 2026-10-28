## MODIFIED Requirements

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
