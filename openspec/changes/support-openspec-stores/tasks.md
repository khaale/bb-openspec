## 1. Проработка
- [x] 1.1 Изучить stores beta, JSON CLI и существующий путь чтения/watcher; оформить proposal/design/spec.

## 2. Реализация
- [x] 2.1 Добавить host resolver через CLI с cache и явными ошибками; покрыть local/store-only/store-optional/default и refresh.
- [x] 2.2 Направить индекс, документы и watcher на выбранный planning root, сохранить lifecycle и confinement.
- [x] 2.3 Добавить source identity в RPC и metadata, изолировать связи и передавать агенту корректный контекст.
- [x] 2.4 Добавить компактный выбор источника и внешнее file preview в UI.

- [x] 2.5 Сортировать active треды первыми, затем changes по mtime артефактов; проверить порядок.

## 3. Проверка
- [x] 3.1 Проверить source isolation, ошибки и watcher смену пути автоматическими тестами.
- [x] 3.2 Проверить установленный плагин на локальном источнике и существующем store без изменения store/registry.
- [x] 3.3 Обновить README/skill/changelog, выполнить tests/typecheck/build и OpenSpec validation.
