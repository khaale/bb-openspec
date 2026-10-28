## Context

The independent pre-release review reproduced the issue twice with empty browser storage. Dropdown changes already publish context, but initial source resolution does not.

## Decision

Publish the resolved project/environment and selected source once when a navigation panel initializes. Wait until the resolved source matches any explicitly requested project/environment. An incoming shared-context selection marks initialization as handled, preventing an obsolete initial result from overwriting another open panel. Thread panels never publish their environment/binding into this navigation state.

## Verification

Reproduce the original fresh-browser Specs deep link followed by Changes. Also verify the reverse direction, a deep link overriding stored context from another project, normal dropdown synchronization and the absence of repeated context writes on query refresh. Use the real installed UI without mutating repositories or launching agents. Existing automated checks cover source isolation and source reads.
