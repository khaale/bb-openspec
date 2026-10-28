# change-management/task-checklist Specification

## Purpose
Shows OpenSpec task groups and their completion status alongside change artifacts, leaving task-state management to the agent and source files.

## Requirements

### Requirement: Read-Only Checklist
The plugin SHALL display tasks from tasks.md with their groups, the Unicode indicators ✓ and ○, the number of completed tasks, and overall progress. The user MUST NOT change task marks or task content through the plugin. Code blocks MUST NOT be interpreted as real tasks.

#### Scenario: Completed and Remaining Tasks
- **WHEN** tasks.md contains completed and incomplete items
- **THEN** the interface shows ✓ and ○, correct counts, and no interactive checkboxes

#### Scenario: No Tasks Yet
- **WHEN** tasks.md is missing or contains no trackable tasks
- **THEN** the interface indicates that there are no tasks and offers to explore the change with an agent
