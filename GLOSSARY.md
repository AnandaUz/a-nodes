# Glossary

Paths relative to `client/src/features/` unless noted.

## Фрейм / Frame

A text edit node (`LNode_TextEdit`) with frame mode enabled (`frame.isFrame = true`). Can have child frames linked via `Ge_Path`. Nodes inside (`list.children`) gain power buttons to toggle clones (`LNode_TEClone`) across child frames.

### Term Mapping

- **фрейм**: `LNode_TextEdit` (`frame.isFrame === true`)
- **родительский фрейм**: `frame.parents` (`Set<{node, path}>`), IDs in `frame.parentsLID`
- **дочерний фрейм**: `frame.children` (`Set<LNode_TextEdit>`)
- **узел во фрейме**: Node where `list.mainParent` is frame (`frame.isInFrame`, CSS `.in-frame`)
- **кнопки включения**: `.el-frame-power-btns .sub .btn-<frameLID>` (active = clone exists in that frame)
- **Add frame button**: `.el-frame-btn .btn.ico-plus`

### Code References

- **Logic**:
  - `nodes/LNode/TFrame.ts` — Core logic on `LNode_TextEdit.frame`.
  - `nodes/LNode/LNode_TextEdit.ts` — Frame owner, calls `frame.redrawPaths()`.
  - `nodes/LNode/LNode_TEClone.ts` — Frame child clone referencing `clones.mainNode`.
  - `nodes/LNode/LNode.ts` — Base tree hierarchy (`list.mainParent`, children).
- **View / CSS**:
  - `nodes/VNode/VTextEdit.ts` — UI rendering & event handlers (`turnOn_frameMode`, power buttons).
  - `nodes/VNode/vNode.scss` — Classes: `.frame`, `.in-frame`, `.el-frame-power-btns`, `.el-frame-btn`.
- **Managers / DB**:
  - `nodes/NodeManager.ts` — Legacy type adaptation (`NODE_TYPES.FRAME.main = 201`/`21`), clone management.
  - `shared/types/ILNode.ts` — `IFrame` interface (`isFrame`, `parents`, `pack()`, `parentsLID`).
  - `shared/types/INodeDB.ts` — DB field `f` (serialized `parentsLID`), `isFrame` accessors.
  - `desk/DeskSVG/Ge_Path.ts` — Connecting SVG bezier path between frames.

### Lifecycle

1. **Creation**: `+` button -> `TFrame.addFrame()` creates copy via `NodeManager.copyNode`, links with `Ge_Path`, activates frame mode, calls `initBtns()`.
2. **Persistence**: Saves `f` (`parentsLID`) and `isFrame` in DB.
3. **Hydration**: `TFrame.init()` restores parent/child links via `parentsLID` and re-renders SVG paths.
4. **Cloning**: Power button click invokes `addCloneOfNode()` or `clones.removeAllClones()`.

---

## листГруппа / Group

A hierarchy of nodes connected via `TList` (`node.list`). If the root parent (`list.mainParent`) is in frame mode (`frame.isFrame === true`), the group behaves as an in-frame item tree.

### Term Mapping

- **Root/Parent**: `node.list.parent` or `node.list.mainParent`
- **Children**: `node.list.children`
- **In-frame Group**: A group where `list.mainParent.frame.isFrame === true`

### Code References

- **Logic**:
  - `nodes/LNode/TList.ts` — Core tree management (parent, children, order, tabs).
  - `nodes/LNode/LNode.ts` — Holds `node.list = new TList(this)`.
- **Managers / DB**:
  - `shared/types/ILNode.ts` — `ITList` interface (`parentLID`, `index`, `tab`).
  - `shared/types/INodeDB.ts` — DB mapping for hierarchy properties.

### Lifecycle

1. **Attachment**: Nodes are attached via `list.setParent()`.
2. **Reordering**: Drag-and-drop or indent changes update `list.index` / `list.tab`.
3. **Traversal**: Operations recursively iterate using `list.forEachChildren()`.

---

## Подфрейм / Subframe

A child frame connected to a parent frame via `TFrame` (`frame.parents` / `frame.children`) and drawn with `Ge_Path`.

### Term Mapping

- **Subframe**: A frame node present in parent frame's `frame.children`.
- **Link path**: `Ge_Path` connecting parent and subframe.

### Code References

- **Logic**:
  - `nodes/LNode/TFrame.ts` — Manages `parents`, `children`, and `redrawPaths()`.
- **View**:
  - `desk/DeskSVG/Ge_Path.ts` — SVG connector between frame bounds.

### Lifecycle

1. **Creation**: Added via parent's `+` button (`TFrame.addFrame()`).
2. **Linking**: Linked to parent's `children` set, registered in `parentsLID`. Manual: drag from `.el-frame-link` (`desk/FrameLinkDrag.ts`) onto a parent frame -> `TFrame.linkToParent()` (duplicates/self/cycles ignored; many parents/children allowed).
3. **Unlink**: click `Ge_Path` (selected) + `X`/`Delete` -> `TFrame.unlinkFromParent()` (clones untouched).
4. **Sync**: Position changes trigger `redrawPaths()` on both ends.

---

## Клон / Clone

A logical clone node (`LNode_TEClone`) synchronized with its original main node via `TClones`.

### Term Mapping

- **Clone Node**: `LNode_TEClone` (instantiated in subframes).
- **Original Node**: Referenced by `clones.mainNode`.
- **Clones Registry**: Set of clones tracked in `mainNode.clones.clones`.

### Code References

- **Logic**:
  - `nodes/LNode/TClones.ts` — Clone synchronization, referencing, and batch removal.
  - `nodes/LNode/LNode_TEClone.ts` — Clone model extending `LNode_TextEdit`.
  - `nodes/LNode/LNode.ts` — Holds `node.clones = new TClones(this)`.
- **View**:
  - `nodes/VNode/VTextEditClone.ts` — UI rendering for clone nodes.
- **Managers**:
  - `nodes/NodeManager.ts` — `create_TextEditCloneNode()`, `initCloneLinks()`.

### Lifecycle

1. **Spawn**: Generated via frame power button (`TFrame.addCloneOfNode()`).
2. **Registration**: Linked to `mainNode.clones` and assigned to target subframe.
3. **Deletion**: Deleting clone toggles off parent frame power button; deleting main removes all clones.

---

## быстраяЗапись / быстрыеЗаметки / Quick Notes

Механизм и API-эндпоинт для оперативного создания текстовых нод из внешних источников без открытия интерфейса доски.

### Term Mapping

- **быстраяЗапись / быстрыеЗаметки**: Создание и получение целевых нод через `GET /nodes/quick-targets` и `POST /nodes/quick-add`.
- **Маркер приемника**: `>>` в `title` ноды (обозначает контейнер для внешней записи).
- **API-ключ**: `API_SECRET_KEY` (передается через заголовок `x-api-key` или `Bearer`).
- **Контроллер**: `quickAddNodeController`, `getQuickTargetsController` в `server/src/controllers/node.controller.ts`.
- **Дефолтные параметры**: `pageId: 6a217eec3f6bb77979b18240`, `type: 1`, `L: 4456625` (`parentLID: 136`, `tab: 1`, начальный `index: 22`).

### Code References

- **Logic / Controller**:
  - `server/src/controllers/node.controller.ts` — `getQuickTargetsController` (выборка целевых нод по `>>`), `quickAddNodeController` (резолв `parentTitle`, упаковка `L`, сохранение).
  - `server/src/routes/node.routes.ts` — Маршруты `GET /quick-targets`, `POST /quick-add`.
- **DB / Model**:
  - `server/src/models/Node.ts` — Модель документа `Node` (`title`, `type = 1`, битовая маска `L`, `pageId`, `s`).

### Lifecycle

1. **Target Discovery**: Клиент запрашивает `GET /nodes/quick-targets` и получает список нод с маркером `>>`.
2. **Request**: Клиент отправляет `POST /nodes/quick-add` с текстом и `parentTitle`.
3. **Auth & Resolution**: Проверяется `API_SECRET_KEY`, находится родительская нода, определяется/назначается её `lID` (в поле `s`).
4. **Index Calculation**: Вычисляется следующий `index` в конце списка детей родителя и упаковывается поле `L`.
5. **Persistence**: Создается и сохраняется дочерняя нода `Node` в БД.

---

## фонФрейма / Frame Background

DOM-подложка (`div.frame-bg`), визуально объединяющая корневой узел фрейма и все его видимые дочерние ноды на холсте.

### Term Mapping

- **фон фрейма**: DOM-элемент `div.frame-bg` на холсте (`VNode.elFrameBg`)
- **z-index координация**: `TFrame.bringToFront()` (подложка на уровне `z`, ноды на `z + 1`)
- **геометрия подложки**: `node.getNodeRect()` вычисляет общий bounding box всех раскрытых детей

### Code References

- **Logic**:
  - `nodes/LNode/TFrame.ts` — `bringToFront()` (координация z-index подложки и всех дочерних нод).
  - `nodes/LNode/LNode.ts` — `getNodeRect()` (вычисление охватывающего прямоугольника дерева).
- **View / CSS**:
  - `nodes/VNode/VNode.ts` — `renderBgSVG()` (создание, позиционирование и вызов `bringToFront`).
  - `nodes/VNode/VTextEdit.ts` — актуализация фона и z-index при переключении списков (`toggleListOpen`, фильтры).
  - `nodes/VNode/vNode.scss` — стили `.frame-bg` (базовый `z-index: 90`, текстура, скругление).

### Lifecycle

1. **Создание**: При наличии видимых детей во фрейме в `renderBgSVG()` создается `div.frame-bg` и крепится к контейнеру холста.
2. **Слои (Z-Index)**: `TFrame.bringToFront()` выставляет фон на `z`, а корневую ноду и всех детей — на `z + 1`, предотвращая перекрытие нод фоном.
3. **Обновление геометрии**: Раскрытие/скрытие списков (`toggleListOpen`, фильтры) и перетаскивание вызывают `mainParent.vNode.renderSVG()` → пересчет `getNodeRect()` и синхронизацию `transform`, `width`, `height`.
4. **Удаление**: При отсутствии видимых детей или отключении режима фрейма подложка удаляется из DOM (`elFrameBg.remove()`).

---

## отложенныеЗадачи / отложенныЗадачи / Delayed Tasks

Механизм отложенного показа и повторения задач по расписанию или дням недели через класс `TRepeatMode`.

### Term Mapping

- **отложенныеЗадачи**: Ноды с активным `repeatMode` (`mode > 0` или `date != null`).
- **задержка/таймер**: `node.repeatMode.setDelay(days)` (установка даты и скрытие узла).
- **индикатор родителя**: `.el-list-btns .btn-repeats` (оранжевый индикатор в `VTextEdit`).
- **индикатор ноды**: `.el-indicators .ind-repeat` (оранжевая точка в `VNodeRepeatMode`).

### Code References

- **Logic**:
  - `nodes/LNode/TRepeatMode.ts` — `TRepeatMode` (`mode`, `date`, `setDelay`, `refreshIndicator`).
  - `nodes/LNode/LNode.ts` — композиция `node.repeatMode = new TRepeatMode(this)`.
  - `nodes/LNode/TList.ts` — предикат `hasRepeatChildren()` для родительских списков.
- **View / CSS**:
  - `nodes/VNode/VNodeRepeatMode.ts` — UI индикатора на самом узле (`showIndicator`, `hideIndicator`).
  - `nodes/VNode/VTextEdit.ts` — кнопка фильтра `.btn-repeats` и метод `toggleRepeatsOpen()`.
  - `nodes/VNode/vNode.scss` — стили `.btn-repeats` и `.ind-repeat` (hsl(32, 95%, 56%)).
- **DB / Manager**:
  - `shared/types/INodeDB.ts` — битовое поле `D` (`blockD: TPackedData` для `mode` 3 бита и `daysFromStartDay` 13 бит).
  - `shared/types/ILNode.ts` — интерфейс `IRepeatMode` (`mode`, `date`).
  - `nodes/NodeManager.ts` — проверка наступления даты (`date < now`) при гидрации.

### Lifecycle

1. **Назначение**: Пользователь задает задержку в днях (`setDelay`) или правило повтора по дням недели (`mode`).
2. **Сериализация**: Поле `D` упаковывает `mode` (3 бита) и смещение дней от опорной даты `2026-10-13` (13 бит).
3. **Скрытие и индикация**: Нода скрывается (`hiddenBD = true`, `hidden = true`), на ней включается `.ind-repeat`, а у родителя загорается кнопка `.btn-repeats`.
4. **Активация**: При наступлении даты `date < now` при загрузке страницы `NodeManager` сбрасывает `hiddenBD = false`, возвращая ноду в отображение.
5. **Фильтрация**: Клик по кнопке `.btn-repeats` у родителя временно принудительно раскрывает/скрывает отложенные задачи списка.

---

## тексЕдит / текстЕдит / TextEdit

Базовый узел с редактируемым текстом (`LNode_TextEdit`), поддерживающий иерархию списков, режим фрейма, клонирование и повторы.

### Term Mapping

- **тексЕдит / текстЕдит**: Базовый текстовый узел (`LNode_TextEdit`, `VTextEdit`, `type: 1`).
- **режим редактирования**: `isEditMode`, `turnOn_EditTitleMode()`, `turnOff_EditTitleMode()`, `contentEditable` на `vNode.titleEl`.
- **поле заголовка**: `vNode.titleEl` (`.el-title`), обработчик `onInput()`.
- **кнопки списка**: `.el-list-btns` (`.btn-open` — раскрытие, `.btn-repeats` — отложенные, `.btn-hidden` — скрытые).

### Code References

- **Logic**:
  - `nodes/LNode/LNode_TextEdit.ts` — Модель текстового узла (`turnOn_EditTitleMode`, `turnOff_EditTitleMode`, `setTitleText`, `onInput`).
  - `nodes/LNode/LNode.ts` — Базовый класс (композиция `list`, `frame`, `clones`, `repeatMode`).
  - `nodes/node-registry.ts` — Регистрация типа (`NODE_TYPES.TEXT_EDIT.id = 1`).
  - `core/comands.ts` — Горячие клавиши (создание по Enter, редактирование по клику).
- **View / CSS**:
  - `nodes/VNode/VTextEdit.ts` — Представление узла (`titleEl`, кнопки управления списком, caret positioning).
  - `nodes/VNode/VNode.ts` — Базовое представление узла DOM.
  - `nodes/VNode/vNode.scss` — Классы `.text-edit`, `.el-title`, `.el-list-btns`.
- **DB / Manager**:
  - `nodes/NodeManager.ts` — Создание (`createNode`, `addNode`), копирование (`copyNode`), вставка (`createNextNodeAfter`).
  - `shared/types/INodeDB.ts` — Поля документа (`type: 1`, `title`, маски `L`, `s`, `D`, `f`).
  - `shared/types/ILNode.ts` — Базовый интерфейс `ILNode`.

### Lifecycle

1. **Создание**: Клик по холсту / нажатие Enter (`comands.ts` -> `NodeManager.createNode` / `createNextNodeAfter`) создает `LNode_TextEdit` (`type: 1`).
2. **Инициализация View**: `core.nodeRenderer.createVNode()` связывает логический узел с `VTextEdit`, настраивая DOM-слушатели.
3. **Редактирование**: `turnOn_EditTitleMode()` переводит `titleEl` в `contentEditable = true`. Ввод вызывает `setTitleText()` и синхронизацию с клонами.
4. **Завершение и сохранение**: `turnOff_EditTitleMode()` удаляет пустой узел либо сохраняет данные через `save()`.
5. **Трансформация**: Узел может переключаться во фрейм (`frame.isFrame = true`), входить в списковую группу (`list.setParent()`) или создавать клоны (`TClones`).


