## Why

The plugin interface currently contains hard-coded Russian strings and is unsuitable for English-speaking users. The installed bb SDK has no shared locale API, so a small plugin-owned localization layer is needed, with the option to connect it to bb later.

## What Changes

- A language setting of auto / en / ru in the standard plugin settings; Auto uses the current browser preferences, with English as the fallback.
- Typed catalogs of English and Russian UI messages, with localization for hints, accessibility labels, statuses, forms, and plugin-owned errors.
- Use Intl for numbers and plural forms. Change the language without restarting or resetting the selected change or edited prompt.
- Keep the starter prompt and supporting agent instructions in English, independent of the UI locale. Preserve the language of repository content, user-provided names, the editable prompt, and external CLI messages; native bb components remain in bb's language.

## Capabilities

### New Capabilities
- `openspec-localization`: language selection and a localized plugin interface.

### Modified Capabilities
None; existing capabilities are currently described in unarchived changes.

## Impact

Frontend and shared messages/errors, bb settings, tests, and documentation. No new runtime dependencies, changes to the user's OpenSpec files, or change to bb's global document.lang.
