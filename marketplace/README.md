# Marketplace preparation

This directory holds the local OpenSpec listing bundle. It has not been submitted.

- `entries/openspec.json`: identity, description, author, categories, search tags and public source.
- `overview/openspec.md`: an exact copy of the root `PLUGIN_OVERVIEW.md`.
- `screenshots/openspec/`: the single screenshot set used by both READMEs and the future marketplace entry.

The public source currently tracks `main` at https://github.com/khaale/bb-openspec.git. Public main was verified at commit `0e5a057c26b88a53bc6f876b8c73b4be9ac6d5eb` with package version 0.5.0 during preparation. No release tag exists. Before submission, choose whether to keep branch tracking or release an approved immutable tag and use a semver range; do not reference a tag that has not been published.

The author account was verified as `khaale` (Aleksander Khanteev). Primary category: Tasks & Workflows; secondary: Code & Reviews. `ListTodo` uses a supported host icon, so no separate artwork file is required.

Copy the three directories above into a clean checkout of https://github.com/get-bb/marketplace, preserving their relative paths. Then run that repository's current validation commands. Do not copy this README into its entry directories.

The local validation uses the current official v1/v2 schemas and build helpers against an isolated single-entry fixture, including image/overview validation and remote source liveness. This does not replace the full marketplace PR checks and review.

No push, release tag, npm publication, fork or marketplace PR is part of this preparation.

## Preparation checks — 2026-10-28

- Current official marketplace `scripts/build.mjs --liveness` passes for the isolated OpenSpec entry, producing valid v1 and v2 documents. The fixture uses the unchanged official build/helpers and schemas with this entry, its assets and a local Git addition date; it contains no other community entries.
- `openspec` is absent from current community entry filenames and reserved IDs.
- Author identity, public repository, main ref and version were read from GitHub.
- Overview copy is byte-identical to `PLUGIN_OVERVIEW.md` and below 4000 characters.
- Desktop capture reports devicePixelRatio 2. Exported Changes and Specs images are 1280 × 900; the directly captured stacked-panel region is 1255 × 933. Every file is below 2 MiB. The thread list is hidden; no thread conversation appears in the gallery.
- Both READMEs use exactly these three screenshot files. Previous README-only files were removed.
- Plugin build passes. Strict current specs pass 9/9; archived change task validation passes 6/6 after archiving manage-specifications.

Before a future submission, refresh public source/release checks and run the full marketplace repository checks on its then-current default branch. The branch source currently points to the public implementation; the new archive, metadata and screenshots are local changes until separately committed and uploaded.
