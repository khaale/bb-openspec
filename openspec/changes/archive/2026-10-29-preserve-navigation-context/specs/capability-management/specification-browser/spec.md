## MODIFIED Requirements

### Requirement: Source-Scoped Live Reading
Tree entries and documents SHALL remain isolated by the selected environment and resolved planning source, including registered stores. Opening an environment-scoped navigation deep link SHALL establish its resolved project, environment and selected planning source as the shared navigation context without requiring a dropdown change. Thread panels MUST NOT publish their thread context into shared navigation state. Changes to main specifications or active deltas SHALL update the affected tree and open document through the existing event-driven lifecycle without periodic rereading. Local specification browsing SHALL work without the OpenSpec CLI. Existing document and path limits SHALL be enforced with explicit errors.

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

#### Scenario: Direct link establishes the navigation context
- **WHEN** a browser without saved navigation context opens an environment-scoped Specs or Changes link and then opens the other view
- **THEN** both views use the environment and project resolved from that link
- **AND** an unrelated first project is not substituted
