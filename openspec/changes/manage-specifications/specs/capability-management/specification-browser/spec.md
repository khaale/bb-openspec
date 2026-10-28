## Purpose

Lets users discover existing and upcoming capabilities in one source-scoped specification tree and read a selected specification without navigating individual changes.

## ADDED Requirements

### Requirement: Separate Specifications Panel
The plugin SHALL provide a Specifications navigation panel alongside the existing change browser. The destinations SHALL use consistent OpenSpec names and distinct icons. Both Changes and Specs SHALL also be available as action tabs in a thread panel, using that thread's environment and planning source. It SHALL present one specification tree and one selected document, rather than separate overview, map, history, or requirement-navigation views.

#### Scenario: Open the specification browser
- **WHEN** the user opens Specifications in bb navigation
- **THEN** the specification tree and selected document are available for the chosen project, environment, and planning source
- **AND** the existing change browser remains available independently

### Requirement: Unified Current and Proposed Tree
The tree SHALL include main specification paths and specification paths found in unarchived changes within the selected planning source. The same full relative capability path SHALL appear once, with its main and change sources associated with that entry. Archived deltas MUST NOT introduce pending entries or pending-change decorations.

#### Scenario: No main specifications before the first archive
- **WHEN** the source has no main specifications but an active change contains delta specifications
- **THEN** the tree shows the capability paths declared by that change
- **AND** the user can open their proposed content without first archiving the change

#### Scenario: Existing and upcoming capabilities
- **WHEN** main specifications and active deltas share one capability path and another capability exists only in an active change
- **THEN** the shared capability appears once and the upcoming capability also appears with its change source identified

#### Scenario: Archived work does not appear as pending
- **WHEN** a source contains main specifications and only archived changes
- **THEN** the tree shows the main specifications without marking the archived deltas as pending work

### Requirement: Recursive Capability Hierarchy
The tree SHALL preserve arbitrary directory nesting and identify a capability by its full path relative to the specification root. A directory SHALL support both its own specification and child capabilities. Parent-child directory containment MUST NOT imply requirement inheritance. The user SHALL be able to expand folders and filter entries by capability name or path using the keyboard or pointer.

#### Scenario: A parent specification and its child
- **WHEN** both core/spec.md and core/live-updates/spec.md exist below the specification root
- **THEN** the tree allows both specifications to be selected within their hierarchy
- **AND** opening the child shows its own requirements without adding the parent's requirements

#### Scenario: Matching leaves in separate branches
- **WHEN** different branches contain capabilities with the same final path segment
- **THEN** the entries remain distinct by their full paths

### Requirement: Selected Specification Document
Selecting an entry SHALL display the complete applicable specification, including its purpose when available, requirements, and scenarios. The document SHALL identify whether it is current or proposed and name the selected change where relevant. On narrow panels, opening a document SHALL provide a return action to the tree. Navigation and updates SHALL retain the selected capability while it remains in the same source.

#### Scenario: Read a specification introduced by a change
- **WHEN** the user selects a capability with no main specification and an applicable added-requirements delta
- **THEN** the proposed specification is displayed with its originating change identified

#### Scenario: Narrow panel navigation
- **WHEN** the user selects a tree entry in a narrow panel and then returns
- **THEN** the document opens without horizontal page overflow and the return action restores the tree

#### Scenario: Missing selected source document
- **WHEN** a selected document cannot be read or is removed
- **THEN** the panel shows the corresponding error or missing state and allows another entry or source to be selected

### Requirement: Git-Style Change Decorations
Specification entries SHALL distinguish unchanged, added, and modified content through muted, green, and amber document icons respectively. Added and modified entries SHALL also provide A/M markers and accessible descriptions, so color is not the only distinction. Selection MUST NOT hide the status color. Removed requirement content SHALL use red removal styling in comparison; removing requirements MUST NOT by itself mark the entire specification as deleted.

#### Scenario: Added and modified entries
- **WHEN** an active change introduces one capability and modifies another existing capability
- **THEN** the tree shows a green A entry and an amber M entry with source-aware status descriptions

#### Scenario: Requirements removed from an existing specification
- **WHEN** a delta removes requirements from an existing specification
- **THEN** the specification remains a modified entry and its removed requirements can be inspected in comparison

### Requirement: Source-Scoped Live Reading
Tree entries and documents SHALL remain isolated by the selected environment and resolved planning source, including registered stores. Changes to main specifications or active deltas SHALL update the affected tree and open document through the existing event-driven lifecycle without periodic rereading. Local specification browsing SHALL work without the OpenSpec CLI. Existing document and path limits SHALL be enforced with explicit errors.

#### Scenario: A main or delta specification is saved
- **WHEN** an agent changes a main specification or an active delta in the observed source
- **THEN** the tree decorations and affected open document update without reloading the application or rereading unrelated specification documents

#### Scenario: Switch between sources with identical capability paths
- **WHEN** the user switches to a different planning source containing the same capability path
- **THEN** the displayed document and proposed changes belong only to the newly selected source

#### Scenario: A document exceeds the configured limit
- **WHEN** a requested specification exceeds the permitted document size
- **THEN** the panel reports that limit instead of displaying a silently truncated specification

#### Scenario: Navigation panels share planning context
- **WHEN** the user changes the project, environment or planning source in either navigation panel
- **THEN** the other navigation panel uses that context when opened and updates if already open in the same browser
- **AND** thread-embedded change panels retain their thread environment and binding

#### Scenario: Read specifications beside a thread
- **WHEN** the user opens OpenSpec · Specs from a thread panel's actions and selects a capability
- **THEN** the specification document opens within that panel using the thread's environment and bound planning source
- **AND** selecting a capability or reading mode does not navigate away from the thread
