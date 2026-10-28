## Purpose

Lets users read the current specification, a selected change's proposed result, and their differences without syncing or modifying repository files.

## ADDED Requirements

### Requirement: Current Proposed and Compare Reading
For a capability affected by an active change, the document SHALL offer Current, Proposed, and Compare where the required baseline and delta are available. Current SHALL show the main specification, Proposed SHALL show the selected change applied to that baseline, and Compare SHALL distinguish the before and after content. These controls SHALL operate within the selected document without replacing the tree with another navigation view. Reading or switching versions MUST NOT write, sync, archive, or launch an agent.

#### Scenario: Switch the reading mode of an affected specification
- **WHEN** the user selects an existing capability and switches between Current, Proposed, and Compare
- **THEN** the tree selection is unchanged and the displayed document reflects the selected reading mode
- **AND** all repository files remain unchanged

#### Scenario: A new capability has no current specification
- **WHEN** a capability is introduced only by an applicable added-requirements delta
- **THEN** Proposed displays the new content and Current identifies that no main specification exists
- **AND** the absence of a main specification is not presented as a reading failure

### Requirement: Explicit Change Selection
A projection SHALL use one identified active change at a time. When multiple changes affect a capability, the document SHALL let the user select its change source and MUST NOT silently merge those changes. An unrelated, unreadable, or archived delta MUST NOT be substituted for the selected source.

#### Scenario: Two changes target the same capability
- **WHEN** two active changes affect the selected capability
- **THEN** the user can choose between them and the proposed result identifies and uses only the chosen change

### Requirement: Apply OpenSpec Requirement Operations
Projection SHALL apply ADDED, MODIFIED, REMOVED, and RENAMED requirement operations using the full capability path and OpenSpec-normalized requirement names. Modified requirements SHALL replace the complete corresponding requirement block, including its scenarios. Explicit rename operations SHALL preserve traceability from the old name to the new name. The projection MUST NOT guess matches from similar prose or infer inheritance from capability directories.

#### Scenario: Added and modified requirements
- **WHEN** an applicable delta adds one requirement and modifies another
- **THEN** Proposed contains the new requirement and the complete replacement block
- **AND** Compare identifies their additions and modifications without marking unchanged requirements as changed

#### Scenario: Requirement removal and rename
- **WHEN** an applicable delta removes one requirement and explicitly renames another
- **THEN** Proposed excludes the removed requirement and uses the renamed requirement
- **AND** Compare retains the removed content for inspection and identifies the rename

#### Scenario: Scenarios removed by a replacement block
- **WHEN** a modified requirement omits a scenario present in its baseline block
- **THEN** that scenario is absent from Proposed and visible as removed in Compare

### Requirement: Explicit Unresolved Projection
If an operation has an ambiguous or missing target, duplicates an existing requirement, requires an unavailable baseline, or uses unsupported delta structure, the document SHALL identify the unresolved operation and its source. It MUST NOT present a partial result as a complete applicable proposed specification. Readable baseline and delta content SHALL remain available independently of a failed projection.

#### Scenario: A modified target does not exist
- **WHEN** a MODIFIED operation names a requirement absent from the available main specification
- **THEN** the panel identifies the missing target and does not claim that a complete proposed specification has been produced
- **AND** the user can still inspect the available main and delta content

#### Scenario: A duplicate added requirement
- **WHEN** an ADDED operation repeats a requirement name already present in the baseline
- **THEN** the projection reports the collision rather than overwriting the existing requirement

### Requirement: Projection Follows Its Sources
The proposed document and comparison SHALL be derived from the current baseline and selected delta, not from a persisted copy. Changes to either source SHALL invalidate the affected projection. Switching the capability, change, or planning source MUST NOT retain a projected result from the previous selection.

#### Scenario: Baseline changes while a delta is open
- **WHEN** the main specification changes while Proposed or Compare is selected
- **THEN** the panel recomputes against the updated baseline or displays any resulting unresolved operations

#### Scenario: The selected change is archived
- **WHEN** the selected active change is archived while its specification is open
- **THEN** the delta stops being offered as pending work and the panel reconciles the entry with the current main specification
