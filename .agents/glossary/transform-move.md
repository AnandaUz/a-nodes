## Трансформация перемещения / TransformMove

Механизм координированного перетаскивания группы выделенных узлов (`TransformMove`) с расчетом мировых координат и оптимизацией через `requestAnimationFrame`.

### Term Mapping

- **стартовые позиции**: `startPositions = new Map<LNode, {x, y}>()`.
- **стартовая мировая точка**: `startWorld = { x, y }`.
- **транзакция истории**: `beginMoveHistoryTransaction`, `commitMoveHistoryTransaction`.

### Code References

- **Logic**:
  - [TransformMove.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/TransformMove.ts#L10-L150) — Методы `start()`, `onPointerMove`, `applyMove()`, `onPointerUp`.
  - [historyCommands.ts](file:///a:/a-node_2.0/client/src/features/core/commands/historyCommands.ts#L40-L120) — Фиксация дельт движения для `History`.
- **View / Interactions**:
  - [SelectManager.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectManager.ts#L16) — Доступ через `core.selectManager.transformMove`.
  - [viewportTransform.ts](file:///a:/a-node_2.0/client/src/features/desk/viewportTransform.ts) — Преобразование экранных координат в мировые (`screenToWorld`).

### Lifecycle

1. **Старт (`start`)**: При начале перетаскивания узла фиксируются начальные мировые координаты указателя и каждого выделенного узла; открывается транзакция истории.
2. **Перемещение (`applyMove`)**: По событию указателя через `requestAnimationFrame` рассчитывается дельта $\Delta x, \Delta y$ и применяется к каждому узлу.
3. **Обновление DOM**: Узлам проставляется класс `.is-dragging`, синхронизируются связанные SVG-пути.
4. **Фиксация (`onPointerUp`)**: Снимаются слушатели, фиксируется транзакция истории `commitMoveHistoryTransaction`, вызывается каскадная проверка иерархии `handleSelectedNodesMoved`.

