# openspec-thread-context Specification

## Purpose
Links OpenSpec changes to bb threads, allowing users to start agent work with the selected change context and return to the associated thread.

## Requirements

### Requirement: Start an Agent for a Change
The plugin SHALL create a visible thread for an active change in the selected project environment. Before sending, the user SHALL choose exploration, implementation, or verification, configure the agent, and edit the first message. The plugin MUST NOT start an agent without an explicit user action. Implementation SHALL be unavailable when there are no tasks.

#### Scenario: Start Implementation
- **WHEN** the user confirms starting implementation of a change that has tasks
- **THEN** a linked thread is created in the same environment with the selected settings and a message containing the change context

#### Scenario: Start Failure
- **WHEN** thread creation fails
- **THEN** the form retains its input and shows an error without automatically retrying the launch

### Requirement: Links to Existing Threads
The user SHALL be able to link an existing thread from the same environment to a change, see linked threads with their current statuses, and open them. Linking MUST NOT send a message to the agent. The thread SHALL provide access to the linked change.

#### Scenario: Link an Existing Thread
- **WHEN** the user selects a thread from the same environment and confirms the link
- **THEN** the thread appears on the change card without starting a new agent turn

#### Scenario: Navigate from a Thread
- **WHEN** the user opens OpenSpec from a linked thread
- **THEN** the linked change is displayed in that thread's environment
