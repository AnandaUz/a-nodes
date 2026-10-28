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
