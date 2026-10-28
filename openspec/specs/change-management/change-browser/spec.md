# change-management/change-browser Specification

## Purpose
Provides bb users with a view of OpenSpec changes and their artifacts in the selected project environment without duplicating repository content.

## Requirements

### Requirement: Select a Source and Browse Changes
The plugin SHALL show active and archived changes in the standard OpenSpec structure for the selected project environment, support searching by name and ID, and show whether proposal/specs/design/tasks exist and task progress. When the environment changes, the data SHALL belong only to the new source.

#### Scenario: Browse Project Changes
- **WHEN** the user selects a project and an environment containing openspec/changes
- **THEN** the plugin shows changes from that environment and lets the user open each one

#### Scenario: OpenSpec Is Missing or Unavailable
- **WHEN** the environment has no OpenSpec directory or reading fails
- **THEN** the interface shows the appropriate empty state or an error with an option to retry loading

### Requirement: View Artifacts
The plugin SHALL display the selected artifact as Markdown and list specifications by capability. Missing artifacts SHALL be clearly indicated. The plugin MUST restrict reads to the OpenSpec directory of the selected environment.

#### Scenario: View Specifications
- **WHEN** the user opens the Specs for a change with multiple capabilities
- **THEN** the user can select and read the corresponding spec.md

#### Scenario: Invalid Path
- **WHEN** a request attempts to read a file outside the selected environment's OpenSpec directory
- **THEN** the plugin rejects the request

### Requirement: Refresh External Changes
The open interface SHALL automatically reread OpenSpec content after changes made by an agent or user, and provide a manual refresh option.

#### Scenario: Agent Updates Tasks
- **WHEN** an agent modifies the open change's tasks.md
- **THEN** the interface updates the task list and progress without reloading the application
