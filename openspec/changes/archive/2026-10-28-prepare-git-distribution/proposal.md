## Why

The plugin works from a local directory, but Git installation uses a different set of dependencies. Before handing over a public repository, this path must be checked and documentation prepared for users and maintainers.

## What Changes

- Verify the build in a clean copy with production dependencies and lifecycle scripts disabled.
- CI checks without publication, an English README with a Russian version, and instructions for a future Git release.
- Describe the plugin in a format suitable for a future Community submission.
- Add the license selected by the owner; do not invent the repository URL or author.

## Capabilities

### New Capabilities
- `plugin-distribution`: reproducible preparation for Git installation and release documentation.

### Modified Capabilities

No runtime behavior changes.

## Impact

Local scripts, devDependencies, documentation, and CI. Pushes, tags, npm publish, and marketplace submission are outside this change.
