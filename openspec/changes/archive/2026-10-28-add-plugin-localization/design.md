## Context

SDK 0.6.79 provides declarative plugin settings and reactive useSettings, but no locale/catalog API. Plugin-owned UI is separate from native bb pickers; RPC and the host index may retain error messages longer than the current interface language.

## Decisions

- The language auto/en/ru setting is stored in bb.settings. In Auto mode, navigator.languages preferences are resolved on the client; languagechange updates the selection. Unknown languages fall back to English.
- The en/ru dictionaries have the same typed keys; React context provides t, Intl.NumberFormat, and plural helpers. The locale belongs to each frontend render tree, not a global server singleton.
- Plugin-owned errors carry a stable message key and parameters in the Error message, while preserving readable English text for the CLI. The frontend decodes the key when displaying it, so changing languages also translates a cached error without rereading files. External errors remain unchanged.
- Default groups without a Markdown heading and missing thread/environment names are represented by an empty string; the UI localizes the fallback without comparing or translating user-provided headings.
- New starter templates and supporting agent instructions are always in English and are not localized. They require following the artifact language specified in the project instructions. The UI locale does not change an already edited first message, tasks/specs content, or project/store names. Setting names, descriptions, and options are always in English.
- No date formatter is added because the current UI has no dates. Intl is used for displayed numbers and task/specification counts.

## Risks / Trade-offs

bb metadata and native components may remain in English. RPC strings for plugin-owned errors receive a code marker; clients outside the UI see the English message. Auto may differ between browsers on the same server, while an explicit language setting is shared by the plugin. The plugin-owned context does not change bb's locale.
