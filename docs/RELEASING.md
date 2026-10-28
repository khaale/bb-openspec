# Release preparation

This repository is being prepared for direct Git installation. Nothing has been published by these checks. Package: `bb-plugin-openspec`; plugin ID: `openspec`; current version: `0.5.0`; license: MIT. The local listing bundle is in [marketplace/](../marketplace/README.md).

## Local checks

```sh
npm ci --include=dev --ignore-scripts
npm run check
npm run verify:git-build
npm run test:stores
openspec validate --specs --strict --no-interactive
```

`test:stores` requires the OpenSpec CLI and uses an isolated temporary registry. The other checks do not require a running bb server. CI runs `check` and `verify:git-build` with pinned `bb-app@0.47.1` and Node 24. It does not publish, push, create tags, or submit a marketplace entry. CI itself must still be observed on GitHub after this update is pushed.

The production build fixture uses bb's Git-install npm flags: `--omit=dev --omit=optional --ignore-scripts`. It checks generated server/app/host metadata against the package identity and version, then removes its temporary files. It tests the build stage; fetching a remote tag and activating a managed installation remain checks for a real public source.

The SDK is a production dependency because the shared RPC contracts import runtime helpers from its root entry. The clean production build verifies that these imports remain available. React and other bb-shimmed UI libraries stay in devDependencies; `zod` and `@radix-ui/react-slot` are bundled dependencies. Do not move shimmed packages into dependencies to resolve a type-only error.

## GitHub repository and update

1. The configured source is `https://github.com/khaale/bb-openspec`; package metadata and both READMEs point to it. The user uploaded the preceding version. This update is prepared as a local commit; verify repository visibility before relying on anonymous Git installation.
2. Review the diff, license and public documentation; inspect screenshots for personal paths or unrelated thread content. `dist/`, dependencies and local environment files are ignored. Historical research documents describe development and may mention fixture projects.
3. Commit the prepared source. The configured origin is `git@github.com:khaale/bb-openspec.git`. Upload only when authorized. A GitHub upload and a versioned release are separate actions.
4. Observe the CI run. Inspect its logs and resolve failures before tagging a release.

The repository URL comes from the configured Git remote. The MIT copyright name currently follows the repository Git author (`a.khanteev`); the public display name can be updated when the owner is confirmed.

## Versioned Git release — later

For this single root plugin, use immutable `vX.Y.Z` tags matching `package.json`. Do not move an existing release tag. The current functional update is `0.5.0`; the local version history does not imply earlier public releases.

Before a release, review the exact account, public repository, commit, version, tag and push commands. A repository upload alone does not authorize publishing a release. After approval, create the annotated tag and push the approved commit and tag. Verify the public ref, then test installation in a separate bb profile or disposable environment so the development installation is preserved.

Once an actual release exists, users can install a compatible version range. These are templates, not a currently available source:

```sh
bb plugin install 'git:https://github.com/khaale/bb-openspec.git@^0.5.0'
# For a deliberately fixed release:
bb plugin install 'git:https://github.com/khaale/bb-openspec.git@v0.5.0'
```

A bare repository URL tracks its default branch. Prefer a tag range for released versions. Users apply updates with `bb plugin outdated` and `bb plugin update openspec`. npm publication is not required for Git distribution and is not part of this preparation.

## Community marketplace — future work

Use the [submit-a-plugin skill](https://github.com/get-bb/bb/blob/main/plugins/bb-guide/skills/submit-a-plugin/SKILL.md) when submission is requested. Re-read the current contracts at that time; the following was checked on 2026-10-28:

- [Marketplace README](https://github.com/get-bb/marketplace/blob/main/README.md), [v2 schema](https://github.com/get-bb/marketplace/blob/main/schema/marketplace-v2.schema.json), [categories](https://github.com/get-bb/marketplace/blob/main/marketplace.base.json), [icon rules](https://github.com/get-bb/marketplace/blob/main/icons/README.md) and two existing entries.
- Candidate primary category: `tasks-and-workflows`. The existing `ListTodo` host icon can be used; custom artwork is optional.
- The entry filename and ID must be `openspec`; neither the current entries nor reserved IDs contain `openspec` as of the check date; recheck availability before submission. The author account must be the actual submitter. `version` and `engines` belong to the plugin manifest, not the entry.
- `PLUGIN_OVERVIEW.md` is prepared beside `package.json`, below 4000 characters and using permitted Markdown. It will be copied into `overview/openspec.md` in the marketplace repository.
- Three current screenshots are captured from the installed plugin in a desktop browser reporting DPR 2: Changes (1280 × 900), Specs (1280 × 900), and stacked Changes/Specs (1255 × 933). The thread list is hidden; the combined view is captured directly from its real panel region. All files are below 2 MiB and shared by the READMEs and listing bundle under `marketplace/screenshots/openspec/`. Old README-only images were removed.
- A local `marketplace/entries/openspec.json` is prepared with the verified public Git source tracking `main`, the actual author account, category/tags and shared screenshot references. Before submission, either keep branch tracking explicitly or create an approved release tag and replace the source with its semver range. No nonexistent tag is referenced.
- In the marketplace checkout, run its current checks: `npm ci`, `npm run build`, `npm test`, `npm run gate:v1`, `npm run check`. The final check verifies remote sources and cannot be completed against an unpublished plugin.
- The current official build and remote-source liveness check pass in an isolated single-entry fixture. This checks our v1/v2 metadata, category, icon, overview and all screenshot files; full marketplace PR checks remain a submission step.
- Only after explicit authorization, prepare the fork/branch and submit a PR. Marketplace acceptance is a separate review and is not implied by passing local checks.

The submission skill is used now for preparation only. The local entry/assets bundle and isolated validation fixture are prepared; no fork, marketplace PR, release tag, push or npm publication is performed by this workflow.
