## Линия Индикатор / Drop Indicator

Визуальный интерактивный маркер (синяя линия с кружком) для предварительного отображения целевой позиции и уровня отступа (`globalTab`) при перетаскивании узлов в список или фрейм.

### Term Mapping

- **индикатор слота / линия индикатор**: SVG-элемент `.dnd-drop-slot-indicator` (синий кружок и линия шириной 120px).
- **целевой слот**: интерфейс `IDropSlot` (`root`, `byNode`, `targetParent`, `insertIndex`, `slotY`, `globalTab`, `indicatorX`, `indicatorY`).
- **сервис расчета слота**: синглтон `DropSlotService.getInstance()`.

### Code References

- **Logic**:
  - [DropSlotService.ts](file:///a:/a-node_2.0/client/src/features/nodes/DropSlotService.ts) — Расчет точки и индекса вставки (`calculateSlot`), обновление состояния (`update`).
  - [nodeHierarchy.ts](file:///a:/a-node_2.0/client/src/features/nodes/nodeHierarchy.ts) — Применение слота при отпускании узлов (`handleSelectedNodesMoved`).
- **View / Interactions**:
  - [DndController.ts](file:///a:/a-node_2.0/client/src/features/nodes/VNode/DndController.ts) — Вызов `DropSlotService.update()` при одиночном DND, скрытие индикатора на `pointerup`.
  - [TransformMove.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/TransformMove.ts) — Вызов `DropSlotService.update()` при групповом перетаскивании.
- **Tests**:
  - [DropSlotIndicator.test.ts](file:///a:/a-node_2.0/client/src/features/nodes/LNode/__tests__/DropSlotIndicator.test.ts) — Регрессионные тесты позиционирования индикатора и применения иерархии.

### Lifecycle

1. **Захват и движение (`update`)**: Во время движения курсора (`DndController` или `TransformMove`) сервис `DropSlotService.calculateSlot()` находит целевое дерево, ближайший предшествующий узел `curr` и вычисляет координаты линии `indicatorX` (с учетом `globalTab`) и `indicatorY` (`slotY = curr.bottom`).
2. **Отображение (`showIndicator`)**: SVG-элемент `.dnd-drop-slot-indicator` позиционируется в абсолютных координатах на канвасе и делается видимым (`display: block`).
3. **Завершение движения (`pointerup`)**: Индикатор скрывается через `hideIndicator()`, а накопленный слот извлекается методом `consumeLastSlot()`.
4. **Применение (`handleSelectedNodesMoved`)**: Если слот обнаружен, перемещаемые узлы без смещения привязываются к `targetParent` по `insertIndex`, после чего `setPositionForChildren` нормализует иерархию дерева.

