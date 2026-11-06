## ноды / Nodes API & Bitmasks

Единый справочник архитектуры, сигнатур публичных методов и битовой упаковки подсистемы нод (`LNode`, `VNode`, `NodeManager`, `INodeDB`).

### Константы типов (`NODE_TYPES` в `node-registry.ts`)

| Константа | `id` | Логический класс | View-класс | Назначение |
|---|---:|---|---|---|
| `NODE_TYPES.TEXT_EDIT` | `1` | `LNode_TextEdit` | `VTextEdit` | Основной текстовый узел, элемент списка или фрейм |
| `NODE_TYPES.TEXT_EDIT_CLONE` | `3` | `LNode_TEClone` | `VTextEditClone` | Клон текстового узла со ссылкой на оригинал |
| `NODE_TYPES.PAGE` | `4` | `LNode_Page` | `VPage` | Узел-ссылка на дочернюю доску (с поддержкой OUT-фреймов) |
| `NODE_TYPES.FRAME.main` | `201` | *(legacy -> `1`)* | *(legacy)* | Конвертируется в `TEXT_EDIT` с `frame.isFrame = true` |

### Битовая раскладка `INodeDB` (`shared/types/INodeDB.ts`)

- **`L` (32 бита — иерархия списка `TList`):**
  - биты `[0..2]` (3 бита, маска `0x7`): `list.tab` (`0..7`).
  - биты `[3..14]` (12 бит, `(L >> 3) & 0xfff`): `list.index + 1` (`0` = не задан).
  - биты `[15..31]` (17 бит, `(L >> 15) & 0x1ffff`): `list.parentLID`.
  - Если `L` задан, координаты `x` и `y` в БД не сохраняются (`undefined`).
- **`s` (22 бита — идентификатор и флаги состояния):**
  - биты `[0..16]` (17 бит, `s & 0x1ffff`): `node.lID`.
  - бит `[17]` (`(s >> 17) & 1`): `frame.isFrame`.
  - бит `[18]` (`(s >> 18) & 1`): `node.hiddenBD`.
  - бит `[19]` (`(s >> 19) & 1`): `!list.isListOpen` (инвертирован: `1` = список свёрнут).
  - бит `[20]` (`(s >> 20) & 1`): `list.isRepeatsOpen`.
  - бит `[21]` (`(s >> 21) & 1`): `list.isHiddenOpen`.
- **`A` (17 бит — клоны `TClones`):**
  - биты `[0..16]` (17 бит, `A & 0x1ffff`): `clones.mainNodeLID`.
  - Поле `c`: строковый ObjectId исходной ноды `clones.sourceNodeId`.
- **`D` (16 бит — отложенные задачи `TRepeatMode`):**
  - биты `[0..2]` (3 бита, `D & 0x7`): `repeatMode.mode` (`0` — выкл, `1..7` — дни недели).
  - биты `[3..15]` (13 бит, `(D >> 3) & 0x1fff`): дни от `START_DATE` (`2026-10-13T00:00:00.000Z`).
- **Прочие поля фреймов:** `f: number[]` (`frame.parentsLID`), `i: boolean` (`isFrameIn`), `o: boolean` (`isFrameOut`).

### Маппинг сущностей и сигнатуры (`client/src/features/nodes/`)

- **Logic (`LNode/`):**
  - [`LNode.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode.ts) — `getNodeRect(withChildren = true): DOMRect`, `moveTo({ x, y }, save = true)`, `hide(withChildren = true, isSelf = true)`, `show(withChildren = true, isSelf = true)`, `select()`, `unselect()`, `remove()`, `save()`.
  - [`LNode_TextEdit.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode_TextEdit.ts) — `turnOn_EditTitleMode()`, `turnOff_EditTitleMode()`, `setTitleText(v, putInInnerHTML, initFromClone)`, `onInput()`, `frame: TFrame`.
  - [`LNode_TEClone.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode_TEClone.ts) — `setLineOfParentsTitle()`, `setRating(v)`.
  - [`LNode_Page.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode_Page.ts) — `checkOutNodesMode()`.
  - [`TList.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TList.ts) — `getSortedChildren(): readonly LNode[]`, `invalidateChildrenOrder()`, `invalidateRectCache()`, `forEachChildren(fn)`, `initParent(parent)`, `setParent(parent, newIndex)`, `clearParent()`, `checkTree()`, `syncChildrenCoordinates()`, `setPositionForChildren(parentX, totalTab, totalIndex, isRoot, isDrag, animate, oldPositions, customOldFrameRect)`, `mainParent`.
  - [`listHierarchy.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/listHierarchy.ts) — `checkTree(owner)`, `clearParent(list, owner)`, `setParent(list, owner, parent, newIndex)`, `syncChildrenCoordinates(node, startY)`, `setPositionForChildren(...)`.
  - [`TFrame.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TFrame.ts) — `init()`, `initBtns()`, `setBtnsState()`, `addFrame()`, `linkToParent(parent)`, `unlinkFromParent(parent)`, `redrawPaths()`, `bringToFront()`, `setIoMode(mode)`.
  - [`TClones.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TClones.ts) — `mainNode`, `sourceNode`, `nodes: Set<LNode>`, `doForAll(fn)`, `removeAllClones()`.
  - [`TRepeatMode.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TRepeatMode.ts) — `mode`, `date`, `setDelay(days)`, `refreshIndicator()`.
- **View (`VNode/`):**
  - [`VNode.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VNode.ts) — `render(measure = true)`, `applyPosition(skipSVG = false)`, `renderSVG(animate, oldFrameRect)`, `prepareMeasure()`, `readMeasure()`, `refreshBodyRect()`, `moveAniTo(x, y, delay)`.
  - [`VTextEdit.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VTextEdit.ts) — `titleEl`, `toggleListOpen()`, `toggleRepeatsOpen()`, `toggleHiddenOpen()`, `refreshListBtns()`.
  - [`DndController.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/DndController.ts) — `onPointerDown(e)`, `onPointerMove(e, fromTransform)`, `onPointerUp(e)`, `flushDragMove()`, `cancelDrag()`.
  - [`ResizeController.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/ResizeController.ts) — `prepareMeasure()`, `readMeasure()`, `refreshBodyRect()`, `checkPointOver(x, y)`, `checkInRect(rect)`.
- **DB / Manager / Diagnostics:**
  - [`NodeManager.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/NodeManager.ts) — `nodes`, `nodesByLID`, `nodesById`, `registerNode(node)`, `unregisterNode(node)`, `getNodeByLID(lID)`, `getNodeById(id)`, `generateLID()`, `ensureLID(node)`, `scheduleNodeUpdate(node)`, `flushPendingUpdates()`, `createNode(opts)`, `copyNode(node, opts)`, `putNodeInTrash(node, withClones)`, `restoreNodeFromTrash(node, withClones)`, `hardDeleteNode(node)`, `searchInRect(rect)`, `getNodeAtPoint(x, y)`.
  - [`nodeLifecycle.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/nodeLifecycle.ts) — `reInitAllNodes(manager)`.
  - [`nodeTextCreation.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/nodeTextCreation.ts) — `addTextEditNodeByEnter(manager, e)`, `addTextEditNodeUnderSelected(manager, selectedNode)`.
  - [`nodeHierarchy.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/nodeHierarchy.ts) — `initCloneLinks(nodes, getNodeByLID, getNodeById)`, `setPositionForAllLinkedChildNodes(nodes)`, `handleSelectedNodesMoved(manager)`.
  - [`nodeSerialization.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/nodeSerialization.ts) — `loadDeskSnapshot(manager, snapshot)`, `diffDeskSnapshot(manager, snapshot, options)`.
  - [`nodeDiagnostics.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/nodeDiagnostics.ts) — `validateNodeGraph(manager): string[]`, `dumpNodeTree(root): string`.
  - [`nodeTestFactory.ts`](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/__tests__/nodeTestFactory.ts) — `setupTestNodeEnv()`, `createTestTextNode(opts)`, `createTestTree(spec)`.

### Lifecycle

1. **Гидратация (`loadDeskSnapshot`):** Распаковка `INodeDB` через `fromDB()`, регистрация в `O(1)` индексах `NodeManager.registerNode()`, связывание родителей списка (`initParent`) и клонов (`initCloneLinks`).
2. **Первичный рендер (`reInitAllNodes`):** Отключение `nodesEl` от DOM, создание `VNode` без индивидуального замера (`measure = false`), подключение `nodesEl`, пакетный сброс ширины (`prepareMeasure`) и чтение размеров (`readMeasure`), расчёт дерева (`setPositionForAllLinkedChildNodes`) и отрисовка фонов/связей (`renderSVG`).
3. **Интеракция и перемещение (`DndController` / `TransformMove`):** Обновление мировых координат в `requestAnimationFrame`, пересчёт поддерева (`setPositionForChildren`) с пропуском дочерних `renderSVG()`, при отпускании (`handleSelectedNodesMoved`) — быстрая синхронизация координат (`syncChildrenCoordinates`), проверка топологии (`checkTree`) и финальный анимированный лейаут.
4. **Сохранение (`LNode.save` -> `ServerPersistence`):** Коалесцирование обновлений через `scheduleNodeUpdate` (`queueMicrotask`), пакетное обновление `SpatialIndex`, дебаунс-отправка на сервер (`api.saveNodes`) и актуализация локального кэша `deskSnapshotStore`.

