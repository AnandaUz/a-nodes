# Отчёт по оптимизации производительности нод, фреймов и списков

> **Дата составления:** 2026-10-21  
> **Область оптимизации:** `!ноды`, `!фреймы` (`TFrame`, `VTextEdit`), `!листГруппы` (`TList`, `NodeManager`)  
> **Связанные задачи:** `..оптимизацияНод`

---

## Сводная матрица приоритетов

| № | Направление | Сложность | Влияние на FPS / Память | Приоритет |
|---|-------------|-----------|-------------------------|-----------|
| **1** | Устранение Layout Thrashing в `setPositionForChildren` | Средняя | 🔥🔥🔥 Критическое (главный лаг драга) | **P0 (Immediate)** |
| **2** | Дросселирование перерисовки при драге через `rAF` | Низкая | 🔥🔥🔥 Критическое (ликвидация статтеров) | **P0 (Immediate)** |
| **3** | Таргетированные подписки вместо `EVENTS.node.updated` на все ноды | Низкая | 🔥🔥 Высокое (масштабирование >300 нод) | **P1 (High)** |
| **4** | Кеширование `getNodeRect()` дерева | Средняя | 🔥🔥 Высокое (убирает рекурсию при каждом тике) | **P1 (High)** |
| **5** | Изоляция Z-Index поддеревьев (CSS Stacking Context) | Средняя | 🔥🔥 Высокое (убирает обход дерева при клике) | **P1 (High)** |
| **6** | Устранение постоянной сортировки в `forEachChildren` | Низкая | 🔥 Среднее (снижение аллокаций памяти) | **P2 (Medium)** |
| **7** | Кеширование DOM-кнопок подфреймов в `VTextEdit` | Низкая | 🔥 Среднее (убирает `querySelector`) | **P2 (Medium)** |
| **8** | Пространственный индекс (Spatial Grid) для поиска нод | Средняя | 🔥🔥 Высокое (быстрый селект и дроп в списки) | **P1 (High)** |
| **9** | Оптимизация перерисовки путей связей `Ge_Path` | Средняя | 🔥 Среднее (гладкость связанных фреймов) | **P2 (Medium)** |
| **10** | Батчинг сетевого сохранения при групповых перестроениях | Низкая | 🔥🔥 Высокое (разгрузка сети и Mongo) | **P1 (High)** |
| **11** | Делегирование событий кнопок клонов во фреймах | Низкая | 🔥 Среднее (минус сотни листенеров) | **P2 (Medium)** |
| **12** | Дебаунс/оптимизация пересчета дерева при `onInput` | Низкая | 🔥 Среднее (гладкость печати длинных текстов) | **P2 (Medium)** |
| **13** | Атомарное перемещение группы нод в `TransformMove` | Средняя | 🔥🔥 Высокое (стабильность мульти-селекта) | **P1 (High)** |
| **14** | Виртуализация отображения (Viewport Culling / `content-visibility`) | Высокая | 🔥🔥🔥 Огромное для гигантских досок (>1000 нод) | **P2 (Long-term)** |
| **15** | Ленивое создание служебных DOM-узлов ноды | Низкая | 🔥 Среднее (экономия памяти DOM в 2-3 раза) | **P2 (Medium)** |

---

## Детальное описание пунктов

### 1. Устранение Layout Thrashing в `setPositionForChildren`
- [x] **Статус:** Выполнено
- **Файлы:** [TList.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TList.ts#L327-L366), [VNode.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VNode.ts#L55-L59)
- **Проблема:** В цикле обхода дочерних узлов на каждый шаг курсора происходит модификация стилей (`transform`, `dataset.totaltab`), после чего немедленно вызывается `refreshBodyRect()` (`offsetWidth`, `offsetHeight`). Браузер вынужден синхронно пересчитывать геометрию документа на каждой ноде.
- **Решение:**
  1. Кешировать размеры (`width`, `height`) во время непрерывного драга (размеры не меняются при обычном смещении).
  2. Разделить алгоритм на этап вычисления координат в памяти и этап пакетной записи стилей в DOM.

---

### 2. Дросселирование перерисовки при Drag & Drop через `requestAnimationFrame`
- [x] **Статус:** Выполнено
- **Файлы:** [VNode.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VNode.ts#L243-L285), [TransformMove.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/core/SelectManager/TransformMove.ts#L32-L40)
- **Проблема:** Обработчик `onPointerMove` выполняется синхронно с частотой мыши (до 240 Гц), вызывая мгновенный вызов `setPositionForChildren()`, `renderBgSVG()` и `redrawPaths()`.
- **Решение:** В обработчике `pointermove` только обновлять переменные целевых координат (`targetX`, `targetY`), а реальное позиционирование и перерисовку линий запускать по флагу в цикле `requestAnimationFrame`.

---

### 3. Таргетированные подписки вместо `EVENTS.node.updated` на все ноды
- [ ] **Статус:** Не начато
- **Файлы:** [VNode.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VNode.ts#L65-L70), [store.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/core/store.ts)
- **Проблема:** При инициализации каждый узел подписывается на событие обновления:
  ```ts
  core.store.on(EVENTS.node.updated, (node) => {
    if (node._id !== this.node._id) return;
    this.applyPosition();
  });
  ```
  При 1000 нодах обновление одного узла выполняет 1000 проверок условий в шине событий.
- **Решение:** Использовать точечные каналы по ID (например, `core.store.onNode(nodeId, cb)`) или вызывать `applyPosition()` непосредственно у экземпляра модели.

---

### 4. Кеширование охватывающего прямоугольника `getNodeRect()`
- [ ] **Статус:** Не начато
- **Файлы:** [LNode.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode.ts#L171-L193), [TFrame.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TFrame.ts#L113-L131)
- **Проблема:** Рекурсивный обход всех дочерних элементов вызывается повторно в `renderBgSVG()`, `redrawPaths()` (дважды: для `parent` и для `child`) и при кликах.
- **Решение:** Хранить закешированное значение `_cachedRect` в `LNode`. Сбрасывать кеш (`_rectDirty = true`) только при изменении структуры детей или изменении текста/размера узла.

---

### 5. Изоляция Z-Index поддеревьев (CSS Stacking Context)
- [x] **Статус:** Выполнено
- **Файлы:** [TFrame.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TFrame.ts#L256-L281), [vNode.scss](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/vNode.scss)
- **Проблема:** Метод `bringToFront()` обходит всех потомков через `forEachChildren()` и каждому проставляет `style.zIndex = String(z + 1)`. При глубоких деревьях это провоцирует массовую перерисовку слоев композитора.
- **Решение:** Использовать контейнер группы/фрейма или свойства CSS (`isolation: isolate`), меняя `z-index` только у одного корневого контейнера.

---

### 6. Устранение постоянной сортировки в `TList.forEachChildren`
- [ ] **Статус:** Не начато
- **Файлы:** [TList.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TList.ts#L115-L125)
- **Проблема:** Метод `forEachChildren` на каждом шаге выполняет `[...this.children].sort(...)`. Для служебных задач (показ/скрытие, подсчет z-index, сбор детей) порядок следования не имеет значения.
- **Решение:** Добавить параметр `ordered = false` для пропуска сортировки, либо поддерживать список детей в отсортированном состоянии при добавлении/вставке.

---

### 7. Кеширование DOM-кнопок подфреймов в `VTextEdit`
- [ ] **Статус:** Не начато
- **Файлы:** [VTextEdit.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VTextEdit.ts#L87-L144), [TFrame.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TFrame.ts#L36-L52)
- **Проблема:** Включение/выключение клонов производит запросы `querySelector(".btn-" + lid)` и `querySelector(".line-" + lid)`.
- **Решение:** Хранить ссылки на созданные кнопки в `Map<number, HTMLElement>` внутри экземпляра `VTextEdit`.

---

### 8. Пространственный индекс (Spatial Grid) для поиска нод
- [ ] **Статус:** Не начато
- **Файлы:** [SelectManager.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/core/SelectManager/SelectManager.ts#L141-L151), [NodeManager.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/NodeManager.ts#L85-L88)
- **Проблема:** Поиск пересечений рамкой выделения и поиск родителя при окончании драга сканируют весь массив нод `core.nodeManager.nodes` с фильтрацией $O(N)$.
- **Решение:** Разбить плоскость доски на ячейки (Spatial Hash Grid) размером 200×200px. Обновлять координаты нод в сетке при движении; выборку производить только из пересекаемых ячеек за $O(1)$.

---

### 9. Оптимизация перерисовки путей связей `Ge_Path`
- [ ] **Статус:** Не начато
- **Файлы:** [TFrame.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TFrame.ts#L113-L131), [Ge_Path.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/desk/DeskSVG/Ge_Path.ts#L63-L76)
- **Проблема:** При движении родительского фрейма рекурсивно перерисовываются пути всех дочерних фреймов и их поддеревьев, обновляя по 4 DOM-атрибута на каждый путь.
- **Решение:** Ограничить обновление только прямыми связями перемещаемого узла. Точки привязки брать от положения заголовка фрейма без глубокого обхода всего дерева.

---

### 10. Батчинг сетевого сохранения при групповых перестроениях
- [ ] **Статус:** Не начато
- **Файлы:** [TList.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TList.ts#L223), [TList.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/TList.ts#L312)
- **Проблема:** В `checkTree` и `setParent` вызов `chNode.save()` происходит для каждого узла в цикле, порождая избыточные события и нагружая `ServerPersistence`.
- **Решение:** Пакетный вызов `saveNodes(nodes[])` после завершения перестроения всего дерева.

---

### 11. Делегирование событий кнопок клонов во фреймах
- [ ] **Статус:** Не начато
- **Файлы:** [VTextEdit.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VTextEdit.ts#L145-L185)
- **Проблема:** Для каждого узла и каждого подключенного подфрейма генерируются отдельные DOM-элементы с индивидуальными листенерами `addEventListener("pointerdown")`.
- **Решение:** Единый обработчик на контейнер `.el-frame-power-btns`, считывающий целевой подфрейм из `e.target.dataset.subframeLid`.

---

### 12. Дебаунс/оптимизация пересчета геометрии при наборе текста `onInput`
- [ ] **Статус:** Не начато
- **Файлы:** [LNode_TextEdit.ts](file:///d:/_sites/a-node%28v.AI%29/client/src/features/nodes/LNode/LNode_TextEdit.ts#L74-L95)
- **Проблема:** Ввод каждого символа текста вызывает `refreshBodyRect()` и потенциальный рекурсивный сдвиг всего списка `setPositionForChildren()`.
- **Решение:** Проверять изменение высоты без сброса `style.width` или откладывать выравнивание дерева через микротаску (дебаунс 50-100мс при непрерывном вводе).

---

### 13. Атомарное перемещение группы нод в `TransformMove`
- [ ] **Статус:** Не начато
- **Файлы:** [TransformMove.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/core/SelectManager/TransformMove.ts#L27-L47)
- **Проблема:** Мульти-драг симулирует события `pointermove` и `pointerup` для каждого узла отдельно, создавая $N$ записей в истории Undo/Redo и дублируя расчеты.
- **Решение:** Вычислять единый дельта-вектор $(dx, dy)$ и сдвигать всю группу за один проход; сохранять одну составную команду истории.

---

### 14. Виртуализация отображения (Viewport Culling / `content-visibility`)
- [ ] **Статус:** Не начато
- **Файлы:** [NodeRenderer.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/NodeRenderer.ts#L48-L56), [vNode.scss](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/vNode.scss#L22)
- **Проблема:** Все узлы присутствуют в DOM-дереве, даже находясь далеко за экраном при текущем масштабе и координатах камеры.
- **Решение:** Внедрение CSS `content-visibility: auto` и `contain-intrinsic-size`, либо скрытие DOM-элементов нод вне `viewport.getVisibleRect()`.

---

### 15. Ленивое создание служебных DOM-узлов ноды
- [ ] **Статус:** Не начато
- **Файлы:** [VTextEdit.ts](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VTextEdit.ts#L76-L85)
- **Проблема:** Элементы `.el-list-btns`, `.btn-open`, `.btn-repeats`, `.btn-hidden` инициализируются в разметке абсолютно каждой ноды, даже если у нее нет дочерних задач.
- **Решение:** Создавать блок кнопок списка лениво в `refreshListBtns()` только при появлении первого дочернего узла.
