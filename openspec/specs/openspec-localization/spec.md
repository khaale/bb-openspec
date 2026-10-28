# openspec-localization Specification

## Purpose
Defines language selection and translation of the OpenSpec interface in bb while preserving the original repository content and agent context.

## Requirements

### Requirement: Select the Interface Language
The plugin SHALL provide a language auto/en/ru setting through bb settings. Auto SHALL select a supported language from the current client's navigator.languages and use English when there is no match. Changing the setting or receiving languagechange SHALL update the UI without a reload.

#### Scenario: Language Is Selected Automatically
- **WHEN** the setting is auto and the browser prefers ru-RU
- **THEN** the interface is in Russian, and English is used for an unsupported set of languages

#### Scenario: Switch Without Losing State
- **WHEN** the user changes the language while a change is open or the first message is being edited
- **THEN** labels update without resetting the selected change, form, or prompt text

### Requirement: Localize Plugin-Owned Messages
All plugin-owned labels, hints, accessibility labels, and statuses SHALL have en/ru catalogs with matching keys. Cached plugin-owned errors SHALL be localized when displayed. Number and plural formatting SHALL use Intl.

#### Scenario: Cached Error and Counts
- **WHEN** the interface changes from ru to en after a plugin-owned error has been received
- **THEN** the error is displayed in English without requesting the data again
- **AND** the forms for counts 1/2/5/21 match the selected locale

### Requirement: Content Language Is Independent of the UI
Changing the UI locale MUST NOT translate repository files, user-provided names, the editable prompt, agent instructions, or external errors. The plugin MUST NOT change document.lang for all of bb.

#### Scenario: Content Remains in Its Original Language
- **WHEN** the English UI displays a Russian specification and user prompt
- **THEN** the content and prompt text remain unchanged

### Requirement: English Starter Template
New first-message templates and agent launch context SHALL be in English regardless of the UI locale. They SHALL require following the artifact language specified by the project instructions. The text of an already edited prompt MUST NOT be overwritten when the language changes.

#### Scenario: Russian UI and English Starter Prompt
- **WHEN** the user opens the launch form in the Russian UI
- **THEN** form labels are in Russian, while the new prompt template is in English and preserves repository paths without translation
