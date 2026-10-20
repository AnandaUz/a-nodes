# a-nodes: AI Context Cheatsheet & Knowledge Base

Этот документ предназначен для быстрого ввода AI-ассистента в контекст проекта `a-nodes` в будущих запросах.

Связанная документация:
- [ARCHITECTURE.md](file:///d:/_sites/a-node(v.AI)/ARCHITECTURE.md) — детальная архитектура системы и потоки данных.
- [GLOSSARY.md](file:///d:/_sites/a-node(v.AI)/GLOSSARY.md) — глоссарий терминов (!фрейм, !группа, !подфрейм, !клон).
- [docs/ANALYSIS_REPORT.md](file:///d:/_sites/a-node(v.AI)/docs/ANALYSIS_REPORT.md) — технический аудит, рекомендации и roadmap.

---

## 1. Концепция и назначение проекта
**a-nodes** — это бесконечный пространственный аутлайнер (Spatial Outliner & Visual Knowledge Graph), сочетающий древовидную структуру списков (WorkFlowy / Dynalist) с пространственной организацией на 2D-холсте (Miro / Heptabase) и концепцией синхронизированных клонов (Frame / Subframe / Clone system).

- **Клиент**: Vanilla TypeScript, Vite, SCSS, SVG Canvas (`DeskSVG`), SPA роутер (`_base`).
- **Сервер**: Node.js, Express 5, TypeScript (`tsx`), MongoDB (Mongoose), Google OAuth, JWT, Telegraf Bot.
- **Монорепозиторий**: npm workspaces (`client`, `server`, `shared`, submodule `_base`).

---

## 2. Глоссарий и ключевые сущности

| Термин | Код / Класс | Описание |
| :--- | :--- | :--- |
| **LNode** | `client/src/features/nodes/LNode/LNode.ts` | Базовая логическая модель узла (координаты, lID, дерево, клоны, повторы). |
| **VNode** | `client/src/features/nodes/VNode/VNode.ts` | Базовое визуальное представление ноды в DOM и SVG-слое. |
| **LNode_TextEdit** | `.../LNode/LNode_TextEdit.ts` | Текстовый узел с поддержкой contenteditable, сплита по Enter, фрейм-мода. |
| **VTextEdit** | `.../VNode/VTextEdit.ts` | DOM-представление текстового узла с кнопками питания клонов и рейтингом. |
| **Фрейм (Frame)** | `TFrame.ts`, `node.frame.isFrame === true` | Узел-контейнер/источник связей. Соединяется с подфреймами через `Ge_Path`. |
| **Подфрейм (Subframe)** | `frame.children` / `frame.parents` | Дочерний фрейм, соединенный кубической кривой Безье с родительским фреймом. |
| **Клон (Clone)** | `LNode_TEClone.ts`, `VTextEditClone.ts` | Синхронизированная копия узла внутри другого фрейма. Ссылается на `mainNode`. |
| **Группа / Дерево** | `TList.ts` (`node.list`) | Иерархия родитель-дети с отступами `tab` (шаг `GRID.x = 50px`) и порядком `index`. |
| **Страница (Desk)** | `LNode_Page.ts`, `VPage.ts` | Портал перехода на вложенную доску (`/desk/:id`). |
| **NodeManager** | `NodeManager.ts` | Синглтон реестра нод, пересчета родительских связей, перетаскивания и сплита. |
| **SelectManager** | `SelectManager.ts` | Выделение узлов рамкой (`SelectionRect`), мультиселект, групповой drag. |
| **ServerPersistence** | `serverPersistence.ts` | Дебаунс-синхронизация с сервером (1000мс), сохранение через `PUT /nodes/saveNodes` и `keepalive fetch` / `sendBeacon` при выгрузке. |

---

## 3. Математика координат и иерархии (`GRID`, `TList`)
- `GRID.x = 50` px (шаг отступа таба).
- `Tools.getDiskPosition(x)` — выравнивание по сетке диска: `Math.round(x / GRID.x) * GRID.x`.
- Дерево рассчитывается сверху вниз (`TList.setPositionForChildren`):
  - Позиция по X: `child.x = owner.x + GRID.x * child.list.tab`.
  - Позиция по Y: накапливается суммированием высоты `child.vNode.height` предшественников.
  - Атрибут `data-totaltab` на DOM-элементе задает масштаб шрифта и отступы через CSS (`calc(var(--f-font-size-start) - var(--f-font-step) * var(--n))`).
- Валидация дерева (`TList.checkTree`): восстанавливает родителя на основе относительного смещения по X (`tabIndex`) при вертикальном перетаскивании.

---

## 4. Битовая упаковка данных в БД (`TPackedData`, `INodeDB.ts`)
Для минимизации размера в MongoDB числа и флаги пакуются побитово:
- `s` (universal): `lID` (17 бит, 0..131071), `isFrame` (1 бит), `hiddenBD` (1 бит).
- `L` (list): `tab` (3 бита, 0..7), `index` (12 бит, 0..4095), `parentLID` (17 бит, 0..131071).
- `A` (clones): `mainNodeLID` (17 бит).
- `D` (dates/repeat): `repeatMode` (3 бита), `daysFromStartDay` (13 бит от `2026-10-13`).
- `f`: массив `number[]` — список `parentsLID` для фреймов.

> ⚠️ **Важное замечание (Gotcha)**: `parentLID` в `L` смещается на 15 бит при ширине 17 бит (15 + 17 = 32 бита). В JavaScript побитовые операторы работают с 32-битными знаковыми целыми (`Int32`), старший бит вызывает смену знака! При превышении требуется `BigInt` или `>>> 0`.

---

## 5. Потоки данных (Data Flow)
1. **User Input / Drag**: `VNode` ловит события `pointerdown/move/up` -> обновляет координаты `LNode`.
2. **Tree Recalculation**: `NodeManager.onSelectedNodesMoved()` определяет кандидата в родители через `getNodeOverRect()`, вызывает `setParent()` и `setPositionForChildren()`.
3. **Event Bus**: `core.store.emit(EVENTS.node.updated, node)` -> ловит `ServerPersistence`.
4. **Network Sync**: `ServerPersistence` добавляет ноду в `dirtyNodes`, дебаунсит 1000мс, конвертирует через `toDB()`, отправляет на `PUT /nodes/saveNodes` (Mongoose `bulkWrite`).
5. **Desk Switch**: URL `/desk/:id` -> `api.loadNodes(id)` -> `core.store.emit(EVENTS.server.loaded)` -> `NodeManager.loadSnapshot()` -> перерендер `nodeRenderer.renderAll()`.

---

## 6. Карта ключевых файлов проекта
- `client/src/features/core/core.ts` — центральный фасад приложения (`core`), режим работы `core.mode`.
- `client/src/features/nodes/NodeManager.ts` — создание, удаление, связывание нод.
- `client/src/features/nodes/LNode/` — логические классы (`LNode`, `LNode_TextEdit`, `LNode_TEClone`, `TList`, `TFrame`, `TClones`).
- `client/src/features/nodes/VNode/` — рендер в DOM (`VNode`, `VTextEdit`, `VTextEditClone`, `VPage`).
- `client/src/features/desk/desk.viewport.ts` — управление зумом, панорамированием, матрицей трансформации.
- `client/src/features/desk/DeskSVG/` — SVG слой связей (`DeskSVG`, `Ge_Path`).
- `server/src/controllers/node.controller.ts` — загрузка, пакетное сохранение (`bulkWrite`) и удаление нод.
- `server/src/models/Node.ts` — Mongoose-схема ноды.
- `shared/types/INodeDB.ts` — упаковщики `TPackedData`, интерфейс `INodeDB`.
