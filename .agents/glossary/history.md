## История и отмена / History & UndoRedo

Менеджер истории команд (`History`), обеспечивающий транзакционность изменений графа, перемещений и текста с возможностью отмены/повтора (`undo`/`redo`).

### Term Mapping

- **история**: `History` экземпляр в `core.history`.
- **команда**: `Command` интерфейс с методами `execute()` и `undo()`.
- **пакетная команда**: `BatchCommand` для объединения нескольких действий в одну транзакцию.
- **транзакция перемещения**: `beginMoveHistoryTransaction`, `commitMoveHistoryTransaction`.

### Code References

- **Logic**:
  - [history.ts](file:///a:/a-node_2.0/client/src/features/core/history.ts#L23-L58) — Базовый стек `past`/`future`, методы `push`, `execute`, `undo`, `redo`.
  - [historyCommands.ts](file:///a:/a-node_2.0/client/src/features/core/commands/historyCommands.ts#L1-L120) — Команды фиксации координат нод до и после перетаскивания.
- **View / Event Handlers**:
  - [c-main-menu](file:///a:/a-node_2.0/client/src/components/c-main-menu/c-main-menu.ts) — Кнопки Undo / Redo в панели управления.
  - [shortcut.ts](file:///a:/a-node_2.0/client/src/features/core/shortcut.ts) — Горячие клавиши `Ctrl+Z` и `Ctrl+Y` / `Ctrl+Shift+Z`.
- **Managers / DB**:
  - [core.ts](file:///a:/a-node_2.0/client/src/features/core/core.ts#L48) — Регистрация синглтона `core.history = new History()`.

### Lifecycle

1. **Захват состояния**: Перед началом операции (перемещение, удаление, смена родителя) запоминаются старые координаты/состояние узлов.
2. **Исполнение**: Мутация графа или позиции применяется в памяти и к DOM.
3. **Регистрация в стеке**: Созданный объект `Command` передается в `core.history.push(command)`.
4. **Отмена (`undo`)**: Извлекается последняя команда из `past`, вызывается `undo()`, состояние пушится в `future`.
5. **Повтор (`redo`)**: Извлекается команда из `future`, вызывается `execute()`, состояние возвращается в `past`.

