## Менеджер выделения / SelectManager

Координатор выделенных узлов канваса (`core.selectManager`), поддерживающий множественное выделение, перемещение группы и синхронизацию состояния.

### Term Mapping

- **выделенные ноды**: `selectedNodes = new Set<LNode>()`.
- **перемещение группы**: делегируется в `transformMove: TransformMove`.
- **прямоугольная рамка**: `SelectionRect` для выделения областей мышью.

### Code References

- **Logic**:
  - [SelectManager.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectManager.ts#L9-L158) — Хранилище `selectedNodes`, методы `selectNode`, `unselectNode`, `clearSelection`, `onNodeMoveEnd`.
  - [TransformMove.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/TransformMove.ts#L10-L150) — Координация синхронного сдвига всех выделенных узлов.
- **View / CSS**:
  - [SelectManager.scss](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectManager.scss#L1-L40) — Стили активных рамок выделения и вспомогательных элементов.
  - [vNode.scss](file:///a:/a-node_2.0/client/src/features/nodes/VNode/vNode.scss) — Классы `.selected`, `.is-dragging`.
- **Managers**:
  - [core.ts](file:///a:/a-node_2.0/client/src/features/core/core.ts) — Инициализация `core.selectManager = new SelectManager()`.

### Lifecycle

1. **Клик / Выбор**: Пользователь кликает по узлу или протягивает рамку `SelectionRect`.
2. **Регистрация**: Узел добавляется в `selectedNodes.add(node)`, навешивается визуальный класс `.selected`.
3. **Групповое движение**: При Drag одного из узлов `TransformMove` перемещает всю группу с сохранением относительных смещений.
4. **Завершение**: Вызывается `onNodeMoveEnd()`, испускается событие `EVENTS.node.selectedMoved`.
5. **Сброс**: Клик по пустому месту канваса вызывает `clearSelection()`.

