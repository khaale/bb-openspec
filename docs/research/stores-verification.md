# Проверка OpenSpec stores, 0.3.0

Дата: 2026-10-28. OpenSpec CLI 1.10.0, bb Plugin SDK 0.6.79.

## Разрешение источника

Локальные planning directories разрешаются напрямую по их приоритету. Для stores источник истины — публичные `openspec context --json [--store <id>]` и `openspec store list --json`, выполняемые через execFile на host окружения. Внутренние registry/YAML модули OpenSpec не импортируются. Содержимое changes, прогресс и наблюдение файлов остаются прямыми файловыми операциями с ограничением planning root.

`npm run test:stores` создаёт store и кодовые каталоги только во временном fixture, задавая изолированные XDG_CONFIG_HOME/XDG_DATA_HOME. Проверены:

- store-only config выбирает внешний store;
- локальные planning directories имеют приоритет над store pointer;
- явный --store переключает store-optional проект;
- defaultStore работает без локального planning root;
- неизвестный store не подменяется локальным источником.

Fixture и временный registry удаляются в finally. Пользовательская регистрация не изменяется.

## Автоматические проверки

27 тестов: parser/RPC/индекс, изоляция одинаковых change id по storeId, сохранение старых локальных bindings, параметры запуска в кодовом окружении, абсолютный planning path, read-only doc preview, смена watcher path и освобождение старой подписки, cache resolver и manual reset, ошибки источника. Отдельно проверены active-first ordering, recency по mtime изменённого артефакта и отсутствие повторного чтения остальных tasks.

Пройдены typecheck, build и strict validation change support-openspec-stores.

## Установленный плагин

- Локальные changes показываются без watchError; support-openspec-stores первым благодаря работающему треду.
- В выборе источника доступны Auto, локальный источник и зарегистрированный magma-agent-toolkit.
- Store прочитан через RPC и интерфейс: 15 активных + 71 архивный change, без ошибок.
- Внешний Proposal прочитан Markdown viewer; «Открыть файл» открыл исходный proposal.md в host preview по пути store, а не code checkout.
- При выборе store кодовое окружение проекта bb-openspec сохраняется; источник виден в свёрнутой шапке.
- Возврат к локальному источнику восстанавливает собственные changes плагина.

Внешний store и пользовательский registry использовались только для чтения. Реальный новый агент не запускался: launch/attach/source isolation проверены SDK harness. Live изменение чужого store не выполнялось; события по внешнему planning root проверены тестом watcher с двумя временными каталогами.

## Границы

Изменения регистрации и store/config selection требуют ручного refresh; watcher следит за файлами выбранного корня без polling. References остаются read-only контекстом CLI workflow, отдельного браузера upstream specs и поддержки Worksets нет. Права агента на внешний planning root определяются его настройками BB.
