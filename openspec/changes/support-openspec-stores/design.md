## Context

OpenSpec stores beta разрешает --store, локальные planning directories, store: и defaultStore. Источник определяется на машине окружения; пути registry другой машины неприменимы. Плагин уже разделяет server RPC и host entry, индексирует файлы на host и использует native watch.

## Goals / Non-Goals

Цель: читать changes и артефакты store, следить за ними и назначать агентам из выбранного кодового окружения. Не создаём stores, окружения, worktrees, worksets или дополнительную базу задач.

## Decisions

- Наличие локальных planning directories имеет приоритет по правилам OpenSpec и разрешается без CLI. Для остальных случаев использовать публичные openspec context --json и store list --json через execFile (без shell). Для явного store context получает --store. CLI валидирует регистрацию и identity store; не копируем beta-форматы registry/YAML.
- Resolver хранит результаты только в памяти host worker, чтобы события tasks.md и thread status не запускали CLI. Ручное обновление сбрасывает discovery/resolution. Смена config/store registry требует ручного обновления; polling не вводится.
- storeId: string означает явный store; null означает локальное openspec/ окружения; отсутствие означает автоматическое разрешение CLI. У обычного локального planning root при отсутствии CLI остаётся прямое чтение.
- Путь источника поступает только от resolver, не из frontend. Индекс остаётся confined выбранным root; документ проверяется на принадлежность change. Внешний документ открывается через host file preview, а агент остаётся в прежнем execution environment.
- Metadata включает storeId. У существующих привязок без storeId источник считается локальным: уже назначенный change не должен молча переключиться на store после изменения config. Новые привязки фиксируют фактически разрешённый источник.
- Watcher наблюдает planning root; прежний индекс освобождается при смене источника. Несколько окружений могут разделять один store watcher. Invalidation может затронуть несколько источников одного окружения, но каждый read сохраняет свой storeId и cached index.
- Prompt и configure содержат абсолютный planning path, execution path и --store для workflow CLI. References CLI остаются read-only контекстом и не назначаются агенту как цели изменения.

- Порядок карточек: active тред прежде остальных, затем mtime файлов change. Индекс кеширует timestamps и обновляет только затронутые пути; сохранение любого артефакта инвалидирует порядок, без чтения остальных tasks.

## Risks / Trade-offs

CLI запускается при discovery/первом разрешении, а не при каждом обновлении. Отсутствующий CLI, неизвестный store и stale registration показываются явно; локальный источник можно выбрать отдельно. Агенту могут потребоваться права на внешний каталог store: плагин не расширяет sandbox и не обещает доступ, а указывает корень планирования отдельно от checkout.
