## шотКат / горячаяКлавиша / Shortcut

Система глобальных горячих клавиш и сочетаний для управления холстом, узлами и командами редактора.

### Term Mapping

- **шотКат / горячаяКлавиша**: Клавиатурное сочетание (`shortcuts: ["enter", "tab", ...], UICommand`).
- **контекст выполнения**: Область действия хоткея (`CommandContext`: `"canvas"` | `"editing"` | `"always"`).
- **реестр команд**: Древовидная и плоская структура команд (`commands`, `getFlatCommands()`, `getShortcutMap()`).
- **инициализация и сброс**: Управление жизненным циклом слушателей (`initCommands()`, `resetCommands()`).

### Code References

- **Logic**:
  - `features/core/comands.ts` — Слушатель клавиатуры (`window.onKeyDown`), нормализация клавиш, фильтрация контекста `when` и диспетчеризация команд.
  - `features/core/commands/editorCommands.ts` — Команды редактора (история undo/redo, создание новой ноды по Enter `when: "editing"`).
  - `features/core/commands/transformCommands.ts` — Трансформации (сдвиг по Tab / Shift+Tab `when: "always"`, переключение фрейма/скрытия).
  - `features/core/commands/nodeCommands.ts` — Создание (`1`, `2`) и управление узлами (`delete`, `x`, `escape`).
  - `features/core/commands/clipboardCommands.ts` — Буфер обмена (`ctrl+c`, `ctrl+v`, `ctrl+x`, `ctrl+d`, `alt+d`).
- **View / UI**:
  - `components/c-main-menu/c-main-menu.ts` — Отображение хоткеев в выпадающих меню.
  - `features/nodes/VNode/VTextEdit.ts` — Фокус поля `titleEl` (`contentEditable`), определяющий режим редактирования.
- **DB / Manager / Types**:
  - `features/core/commands/types.ts` — Типы `UICommand`, `CommandContext` (`"canvas"` | `"editing"` | `"always"`).
  - `features/nodes/NodeManager.ts` — Методы создания узлов по горячим клавишам (`addTextEditNode_byEnter`, `createNodeWithTypeAndPositionFromCursor`).

### Lifecycle

1. **Регистрация**: Команды декларируются в `commands` (`editorCommands`, `transformCommands` и др.) с указанием `shortcuts` и `when`.
2. **Сборка карты**: `getShortcutMap()` нормализует сочетания (`cmd+` → `ctrl+`) и сохраняет их в `Map<string, UICommand>`.
3. **Инициализация**: `initCommands()` подписывается на `keydown` окна с поддержкой отмены через `AbortController`.
4. **Фильтрация контекста**: При нажатии отсекаются нативные элементы ввода (`INPUT`, `TEXTAREA`), и проверяется соответствие контекста (`when: "canvas" | "editing" | "always"`).
5. **Исполнение**: Найденная команда вызывает `cmd.execute(e)`, при необходимости манипулируя узлами и фиксируя шаг в `core.history`.

