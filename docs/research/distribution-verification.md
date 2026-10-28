# Подготовка распространения, 0.4.0

Дата: 2026-10-28. Проверено локально на macOS, Node 24.20.0, bb / bb-app 0.47.1, SDK 0.6.79.

## Материалы и оформление

Изучены приложенные материалы, bb-plugin-authoring и submit-a-plugin. Прочитаны актуальные README, v2 schema, marketplace.base.json, icons/README.md и два существующих entry из get-bb/marketplace. Кандидат категории — tasks-and-workflows; openspec отсутствует в текущих entries и reserved IDs. Проверку нужно повторить перед заявкой.

По выбору владельца добавлена MIT license. Основной README переведён на английский, русская версия сохранена отдельно. Overview приведён к формату каталога: ## headings, разрешённый Markdown, менее 4000 символов. Добавлены docs/RELEASING.md и CI без write permissions и шагов публикации.

## Сборка и проверки

- npm run check: typecheck, 31 тест и сборка пройдены.
- npm run verify:git-build: после исправления зависимостей пройдено. Первая проверка выявила недоступный root runtime import SDK при omit=dev; SDK перенесён в dependencies. Повторная чистая сборка устанавливает только production-зависимости с omit=optional и ignore-scripts, собирает server/app/host и проверяет identity/version metadata. Рабочие зависимости и установленный плагин не заменяются.
- Отдельно проверен build закреплённым npm bb-app 0.47.1 без BB_CLI redirect.
- npm run test:stores: четыре интеграционных сценария пройдены.
- Strict validation: prepare-git-distribution и add-plugin-localization пройдены.
- git diff --check: пройдено.

## Оставшиеся этапы

Пользователь настроил origin git@github.com:khaale/bb-openspec.git и загрузил предшествующее состояние. Метаданные repository/homepage/bugs и команды установки main заполнены по этому remote. Для текущего обновления запрошен локальный commit; после его загрузки нужно проверить CI на GitHub, а релизный tag выбрать отдельно. Чистая сборка проверяет build stage Git-установки; удалённый fetch и activation ещё не проверены.

Скриншоты README обновлены: английский интерфейс, полный вид 1280 × 900 и narrow panel 320 × 900, расположенные рядом. Отдельный compact list удалён. Снимки просмотрены, личных путей и посторонних тредов в кадрах нет. Полный вид соответствует минимальной ширине Community; narrow panel для заявки потребуется снять заново с контекстом окна (минимум 1200 px). Также нужны реальный автор и публичный source. Marketplace validation не запускалась: готового удалённого источника и записи ещё нет.

Push, теги, npm publish и marketplace PR не выполнялись. Новых агентных тредов не создавалось.
