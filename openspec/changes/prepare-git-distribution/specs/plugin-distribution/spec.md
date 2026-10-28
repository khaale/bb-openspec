## ADDED Requirements

### Requirement: Git installation build verification
Репозиторий SHALL предоставлять локальную проверку сборки с теми же флагами установки зависимостей, которые использует Git-установка bb.

#### Scenario: Production dependencies only
- **WHEN** сопровождающий запускает проверку
- **THEN** сборка выполняется во временной копии без devDependencies, optionalDependencies и install scripts
- **AND** рабочие node_modules и установленный плагин сохраняются
- **AND** временная копия удаляется после завершения

### Requirement: Release preparation without publication
Документация SHALL описывать Git-установку и будущие действия релиза отдельно от локальных проверок.

#### Scenario: Repository URL is not yet known
- **WHEN** локальная подготовка завершена
- **THEN** документация обозначает незаполненные данные источника
- **AND** автоматические проверки не создают теги, не выполняют push и не публикуют пакет
