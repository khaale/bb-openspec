# Isolated installation verification

Verified on 2026-10-29 with bb 0.47.1 and Node 24.20.0. A disposable bb data directory, dedicated loopback server/daemon ports and temporary npm cache kept the development profile unchanged. No agent threads were started.

## Public Git source

Installed `git:https://github.com/khaale/bb-openspec.git@ffcfd259e1d77ed1b6974a4d7b7040d16b678783` through `bb plugin install --yes` in the disposable profile. bb fetched the repository, installed production dependencies, built the plugin and activated `openspec@0.5.0`. The `openspec-live` service was running and the frontend SDK bundle was compatible.

## Latest working candidate

Copied the working candidate, including the navigation-context fix and archived change, into a temporary source checkout. Built it with production dependencies using `--omit=dev --omit=optional --ignore-scripts`. Removed only the isolated profile's Git installation and installed this snapshot by local path. Activation passed, `openspec-live` was running, the schema-validated `sources` RPC returned the disposable project, and both frontend assets returned HTTP 200. This profile had no agent environment, so repository browsing and navigation regressions were covered by the separate [installed browser verification](navigation-context-verification.md).

The temporary candidate was not a public release. A final public tag must still be installed after publication to verify that exact release source. BB does not support `git:file://` as a substitute for a public Git source.

## Marketplace preparation

Prepared `submit-openspec` in the adjacent `bb-marketplace` fork, with only the entry, overview and three screenshots. Full catalog build and the v1 addition gate passed. All 47 Node tests and the R2 retry tests passed with the system Git 2.50.1 (`PATH=/usr/bin:$PATH npm test`). Homebrew Git 2.42.0 causes an existing date-format assertion to fail (`+00:00` versus `Z`); no marketplace test or script was changed.

The listing initially tracks the existing public `main` branch. After an approved versioned release, change it to `^0.5.0`, verify public source liveness again, and submit the marketplace PR.
