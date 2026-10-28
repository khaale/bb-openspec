# Navigation context regression verification

Verified against the installed openspec@0.5.0 plugin in an isolated headless browser on 2026-10-28. No real repository files, settings, bindings or agent threads were changed by the browser checks.

## Original regression

The independent pre-release review reproduced this twice: with no openspec:planning-context in browser storage, open `/plugins/openspec/specifications/env_si28uxswjr/core/localization`, then click OpenSpec · Changes. Specs resolved bb-openspec, but Changes selected praxis, the first unrelated project. Initial source resolution did not publish shared context; only dropdown handlers did.

## Fix

A navigation panel remembers its first resolved project/environment and selected planning source. It waits for any requested route or selection to match, rather than saving temporary fallback data. An incoming shared selection marks initialization as handled, preventing an obsolete initial result from overwriting it. Thread panels bypass this publication.

## Installed browser checks

1. Fresh-storage Specs deep link resolves bb-openspec/main and saves its project/environment. Clicking Changes retains bb-openspec/main.
2. Clear storage, open the environment-scoped Changes archive link, then click Specs. Both retain bb-openspec/main.
3. With cleared storage, an unscoped Changes route initially selects and remembers praxis/main. Opening the explicit bb-openspec Specs deep link overrides that saved context correctly.
4. Instrument Storage.setItem after initialization, then refresh the Specs data. The number of planning-context writes remains zero; refresh does not republish or loop.
5. Keep Specs and Changes open in separate browser pages. A project dropdown change to praxis updates both. Selecting the registered magma-agent-toolkit store updates both source labels without UI errors. Store content is read-only; no private document text is recorded here.

## Automated checks

- npm run check passes: typecheck, all 40 existing tests and server/app/host build.
- Strict OpenSpec validation passes for all nine main specs and the preserve-navigation-context delta.
- git diff --check passes.

The regression is exercised through the actual browser rather than a unit test that duplicates the effect's implementation. Existing automated source-isolation, watcher and projection checks remain unchanged.
