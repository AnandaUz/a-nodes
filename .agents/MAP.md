# Архитектурная карта проекта a-node_2.0

Краткий навигатор по слоям, ответственности модулей и потокам данных.

## Схема слоев и взаимодействия

```text
       [Пользователь / Указатель / Клавиатура]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │       View Layer (VNode / Desk)   │ ◄─── Чистый DOM, SVG, SCSS, pointer-events
        │   VTextEdit, SelectionRect, SVG   │      (Без бизнес-логики и мутаций графа)
        └─────────────────┬─────────────────┘
                          │ (делегирование команд / событий)
                          ▼
        ┌───────────────────────────────────┐
        │   Coordination & History Layer    │ ◄─── SelectManager, History, Core Store
        │  TransformMove, HistoryCommands   │      (Управление выделением и Undo/Redo)
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │       Logic Model (LNode)         │ ◄─── LNode_TextEdit, LNode_TEClone, LNode_Page
        │  TList, TFrame, bitmasks (s, L)   │      (Иерархия, инварианты, геометрия графа)
        └─────────────────┬─────────────────┘
                          │ (save dirty / batch sync)
                          ▼
        ┌───────────────────────────────────┐
        │     Manager & Persistence Layer   │ ◄─── NodeManager, SpatialIndex, ServerPersistence
        │     toDB() / fromDB(), REST API   │      (Упаковка битовых масок, Mongoose/MongoDB)
        └───────────────────────────────────┘
```

## Зоны ответственности директорий

| Путь | Назначение и ограничения |
|---|---|
| `client/src/features/core/` | Ядро приложения: шина `core.store`, `core.history`, `SelectManager`, `Tools`. |
| `client/src/features/nodes/LNode/` | Логическая модель: базовый `LNode`, `TList` (списки), `TFrame` (фреймы), `nodeBits`. |
| `client/src/features/nodes/VNode/` | Визуальное представление: `VTextEdit`, нативные элементы DOM, SVG рендеринг. |
| `client/src/features/nodes/spatial/`| `SpatialIndex` (R-tree / grid) для быстрого пространственного поиска узлов на доске. |
| `client/src/features/desk/` | Вьюпорт, панорамирование, масштабирование канваса и координатные сетки (`GRID.x = 50`). |
| `shared/types/` | Контракты и сериализация: `INodeDB.ts` (битовые маски `s`, `L`, `A`, `D`, `P`), `IExData.ts`. |
| `server/src/` | Сервер Express + Mongoose: многопользовательская изоляция (`userId`), валидация и персистентность. |

## Ключевые инварианты потока данных

1. **Мутации графа:** Строго через методы `LNode.list` (`setParent`, `clearParent`, `setPositionForChildren`) или команды истории (`HistoryCommand`).
2. **Битовые поля:** Изменение состояния нод — только через типизированные свойства модели (`node.lID`, `node.frame.isFrame`, `node.hiddenBD`, `node.list.tab`, `node.list.index`, `node.clones.mainNodeLID`). Упаковка сырых чисел (`s`, `L`) разрешена только в `toDB()`.
3. **Персистентность:** Нода помечается грязной (`node.save()`) и сохраняется дебаунсом через `core.serverPersistence`.

