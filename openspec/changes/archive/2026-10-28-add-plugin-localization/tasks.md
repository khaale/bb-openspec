## 1. Exploration
- [x] 1.1 Check the bb settings API and document the localization boundaries.

## 2. Implementation
- [x] 2.1 Add a language setting, typed catalogs, locale resolution, a React provider, and Intl helpers.
- [x] 2.2 Localize the UI, forms, hints, accessibility labels, and plugin-owned fallback labels.
- [x] 2.3 Localize plugin-owned errors at the display boundary while preserving external messages and the agent language.

## 3. Verification
- [x] 3.1 Use tests to check auto/fallback, plural/interpolation, and errors.
- [x] 3.2 Check en/ru settings live without reload, form/change persistence, and the narrow panel.
- [x] 3.3 Update the documentation; run typecheck/tests/build and OpenSpec validation.
