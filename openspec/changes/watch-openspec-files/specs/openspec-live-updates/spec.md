## Purpose

Обеспечивает своевременное обновление панелей OpenSpec при изменениях файлов и тредов, не создавая периодической нагрузки на файловую систему неизменившегося проекта.

## ADDED Requirements

### Requirement: Обновление по событиям
Открытые данные OpenSpec SHALL обновляться после файловых событий выбранного окружения. Плагин MUST NOT периодически сканировать каталог или перечитывать документы при отсутствии событий и пользовательских запросов. Частые события одной операции сохранения SHALL объединяться.

#### Scenario: Неизменившийся проект
- **WHEN** пользователь оставляет панель открытой и файлы не меняются
- **THEN** плагин не выполняет повторных файловых чтений по таймеру

#### Scenario: Агент сохранил задачу
- **WHEN** агент изменяет tasks.md
- **THEN** плагин обновляет статусы и прогресс соответствующего change без чтения tasks.md остальных изменений

### Requirement: Общий watcher и освобождение ресурсов
Панели одного источника SHALL использовать общий watcher. После закрытия последней наблюдающей панели плагин SHALL освобождать watcher и его индекс. Закрытие одной панели MUST NOT прерывать обновление остальных.

#### Scenario: Две панели
- **WHEN** две панели одного окружения открыты, затем одна закрывается
- **THEN** оставшаяся продолжает получать обновления через общий watcher

### Requirement: Восстановление и ошибки
При потере событий, reconnect и изменении структуры OpenSpec плагин SHALL восстанавливать актуальное состояние. Создание, удаление и пересоздание каталога SHALL отображаться без перезапуска плагина. Ошибка наблюдения SHALL быть видна пользователю и SHALL допускать ручное повторное чтение.

#### Scenario: Каталог пересоздан
- **WHEN** каталог OpenSpec удаляется и затем создаётся заново
- **THEN** панель отображает отсутствие каталога, затем новый набор изменений

### Requirement: Обновление тредов
Изменения состояния связанных тредов SHALL отражаться по событиям bb без файлового сканирования.

#### Scenario: Агент завершил ход
- **WHEN** связанный тред переходит в idle
- **THEN** панель обновляет его статус без повторного чтения задач из файлов

### Requirement: Согласованное отображение прогресса и связи
Список изменений SHALL показывать пропорциональный прогресс задач и состояние связанного треда. Сохранённая привязка SHALL сохраняться при переключении изменений и повторном открытии панели.

#### Scenario: Возврат к связанному изменению
- **WHEN** пользователь привязывает тред, открывает другой change и возвращается
- **THEN** исходный change показывает тот же связанный тред и его актуальное состояние

#### Scenario: Разный прогресс
- **WHEN** у одного change выполнены 8 из 8 задач, у другого 1 из 6
- **THEN** полосы прогресса отражают 100% и примерно 17%, рядом показаны соответствующие счётчики

### Requirement: Compact change list
The panel SHALL offer a persisted compact mode displaying only change cards, with navigation to details and back. Cards with nonzero task totals and all tasks done SHALL show an explicit completed label and green progress.

#### Scenario: Browse compact cards
- **WHEN** the user enables compact mode and opens a card
- **THEN** the panel displays that change's details with a return action to the card list
- **AND** reopening the panel retains the compact mode preference

### Requirement: Narrow panel header and active agent animation
The header SHALL keep project/environment controls and view actions usable at narrow panel widths. An active linked thread SHALL display an animated spinner beside its status, respecting reduced-motion preferences.

#### Scenario: Compact narrow panel with working agent
- **WHEN** a linked thread is active and the panel is 286 pixels wide
- **THEN** the header controls fit within the panel and the active card shows a spinner beside its working status

#### Scenario: Collapsed source controls
- **WHEN** the panel is opened
- **THEN** the header shows a compact source summary instead of project/environment selectors
- **AND** clicking the summary expands selectors, with Escape or another click collapsing them
- **AND** narrow panels show the project name while the full context remains available in a tooltip
