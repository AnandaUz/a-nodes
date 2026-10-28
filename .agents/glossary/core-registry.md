# Карта сущностей / Core Symbol Registry

Быстрый доступ к ключевым модулям ядра `core.*` без предварительного поиска.

| Символ | Путь к файлу | Роль |
|---|---|---|
| `core.nodeManager` | [NodeManager.ts](file:///client/src/features/nodes/NodeManager.ts) | Логические ноды (`nodes`), CRUD, клоны |
| `core.nodeRenderer` | [nodeRenderer.ts](file:///client/src/features/nodes/nodeRenderer.ts) | DOM-представления нод (`vNodes`) и рендер |
| `core.selectManager` | [SelectManager.ts](file:///client/src/features/core/SelectManager/SelectManager.ts) | Выделение, drag-выборка, рамка |
| `core.desk` | [desk.ts](file:///client/src/features/desk/desk.ts) | Рабочая область, зум, панорамирование, SVG-слой |
| `core.history` | [history.ts](file:///client/src/features/core/history.ts) | Undo/Redo стек команд |
| `core.clipboard` | [Clipboard.ts](file:///client/src/features/core/Clipboard.ts) | Буфер обмена (copy/paste нод) |
| `core.serverPersistence` | [serverPersistence.ts](file:///client/src/features/core/serverPersistence.ts) | Синхронизация данных с `/api/nodes` |
| `core.store` | [store.ts](file:///client/src/features/core/store.ts) | Шина событий и реактивные события (`EVENTS`) |
| `core.popupSort` | [c-popup-sort.ts](file:///client/src/components/c-popup-sort/c-popup-sort.ts) | Меню сортировки |
| `commands` | [comands.ts](file:///client/src/features/core/comands.ts) | Горячие клавиши и диспетчер команд |
