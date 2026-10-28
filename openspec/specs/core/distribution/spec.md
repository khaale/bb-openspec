# core/distribution Specification

## Purpose
Defines reproducible checks for installing the plugin from Git and release-maintenance documentation without automatic publication.

## Requirements

### Requirement: Git installation build verification
The repository SHALL provide a local build check using the same dependency-installation flags as bb's Git installation.

#### Scenario: Production dependencies only
- **WHEN** a maintainer runs the check
- **THEN** the build runs in a temporary copy without devDependencies, optionalDependencies, or install scripts
- **AND** the working node_modules and installed plugin are preserved
- **AND** the temporary copy is deleted after completion

### Requirement: Release preparation without publication
The documentation SHALL describe Git installation and future release actions separately from local checks.

#### Scenario: Repository URL is not yet known
- **WHEN** local preparation is complete
- **THEN** the documentation identifies source details that have not yet been filled in
- **AND** automated checks do not create tags, push, or publish the package
