## Строка предков / Line of Parents Title

UI-элемент хлебных крошек над заголовком ноды-клона (`.el-lineOfParentsTitle`), отображающий цепочку родительских узлов и тайтл главного фрейма.

### Term Mapping

- **строка предков**: Контейнер `.el-lineOfParentsTitle` в `VTextEditClone`.
- **тайтл главного фрейма**: Название исходного фрейма (`frameNode` / `frame.parents`), отображаемое в хлебных крошках клона.

### Code References

- **Logic**:
  - `nodes/LNode/LNode_TEClone.ts` — Метод `setLineOfParentsTitle()` вычисляет цепочку предков от `mainNode` и родительских фреймов.
- **View / CSS**:
  - `nodes/VNode/VTextEditClone.ts` — Создание элемента `.el-lineOfParentsTitle` и вызов в `render()`.
  - `nodes/VNode/vNode.scss` — Стили блока `.el-lineOfParentsTitle` и дочерних `span`.

### Lifecycle

1. **Mount**: Создаётся в `VTextEditClone.bodyInit()` внутри DOM ноды-клона.
2. **Render**: При `render()` клона вызывается `LNode_TEClone.setLineOfParentsTitle()`.
3. **Resolve**: Поиск родителей по `mainNode.list.parentNode`, `mainParent`, либо по `frame.parents` родительского фрейма.
4. **Update**: Обновляется при `refresh()` родительских нод или изменении структуры фреймов.

