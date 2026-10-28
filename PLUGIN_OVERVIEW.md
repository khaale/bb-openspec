## What you get

Open **OpenSpec · Changes** to browse active and archived changes beside your agent threads. Read proposals, delta specifications and designs, inspect task progress, and see which linked agents are working. Choose a compact card list or a view with task details.

Launch an agent to explore, implement or verify a change using bb's provider, model and permission controls. The new thread is linked automatically; existing threads can be assigned without starting work. Both Changes and Specs are available in navigation and as thread panel actions.

Open **OpenSpec · Specs** for a searchable tree of current and upcoming capabilities. Read whole documents in Current, Proposed or Compare, choose one change when several apply, and inspect unresolved operations with their sources. Nested paths and specifications before the first archive are supported. Both navigation panels share the selected planning context.

## How it works

Progress comes from read-only checklists in `tasks.md`. Agents update repository files; native file watching updates the cards. Working agents appear first, followed by recently modified changes. Local planning directories and registered OpenSpec stores are supported. The interface offers English, Russian and automatic browser-language selection.

## Requirements

Requires bb 0.47 or later with Plugin SDK 0.6.79 or later and a ready environment. Store discovery additionally requires the OpenSpec CLI on the environment machine. Agent runs use a provider configured in bb; the plugin needs no external account or service.

Standard OpenSpec change layouts are supported. Custom workflow schemas and Worksets are not interpreted. Task completion does not perform validation or archive a change.
