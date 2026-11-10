## Селектор рамки / SelectionRect

Интерактивный компонент прямоугольного лассо (`SelectionRect`) для группового выделения узлов на канвасе при протягивании указателя мыши.

### Term Mapping

- **прямоугольник выбора**: `DOMRect` рассчитываемый по двум точкам `p1` (начало) и текущему положению курсора.
- **контейнер**: `selectBox` HTMLDivElement, стилизуемый с пунктирной или полупрозрачной заливкой.

### Code References

- **Logic / DOM**:
  - [SelectionRect.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectionRect.ts#L3-L102) — Обработка `onPointerDown`, `onPointerMove`, `onPointerUp`, вычисление `DOMRect`.
- **View / CSS**:
  - [SelectManager.scss](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectManager.scss#L10-L30) — Стили `.selectBox`.
- **Manager**:
  - [SelectManager.ts](file:///a:/a-node_2.0/client/src/features/core/SelectManager/SelectManager.ts#L11) — Контейнер и обработчик завершения выборки узлов.

### Lifecycle

1. **Клик (`pointerdown`)**: Если клик произошел по пустому канвасу (не по узлу или фрейму), создается начальная точка `p1`.
2. **Протягивание (`pointermove`)**: Элемент `.selectBox` пересчитывает ширину, высоту и позицию на экране.
3. **Завершение (`pointerup`)**: Вычисляется итоговый `DOMRect`, запрашиваются пересекающиеся узлы через `SpatialIndex` / `getNodeOverRect`, выделенные узлы передаются в `SelectManager.selectNodes()`, элемент `.selectBox` скрывается.

