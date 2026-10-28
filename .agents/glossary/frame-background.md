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
