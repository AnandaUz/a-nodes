## Главное Меню / Main Menu

Верхнее навигационное меню приложения для запуска команд ядра через клики и отображения привязанных горячих клавиш с подсказками.

### Маппинг сущностей
- **Logic:** `client/src/features/core/comands.ts`, `client/src/features/core/commands/` (`UICommand`)
- **View:** `client/src/components/c-main-menu/c-main-menu.ts`, `c-main-menu.html`, `c-main-menu.scss`
- **Mount / Container:** `client/src/components/header.ts` (`<c-main-menu>`)
- **Figma Design Node:** [node-id=3103-1422](https://www.figma.com/design/MwgXdiAvMZmxc6pwh9wHKS/%D0%93%D0%BB%D0%B0%D0%B2%D0%BD%D1%8B%D0%B9?node-id=3103-1422)

### Правила связывания с Figma (Design Tokens & Naming)
1. **Именование слоёв и селекторы:** Слои в Figma именуются в точном соответствии с CSS-классами и `data-name` элементами (`.main-menu`, `.menu-tab-btn`, `.menu-dropdown`, `.menu-item`, `.menu-divider`, `.menu-item-arrow`).
2. **Токены дизайна (CSS Custom Properties):** Все стили вынесены в `:host` переменные в `c-main-menu.scss` (`--main-menu-tab-*`, `--main-menu-dropdown-*`, `--main-menu-item-*`, `--main-menu-divider-*`). При локальных изменениях цвета/радиуса в Figma обновляется только соответствующий токен.

### Жизненный цикл (Lifecycle)
1. **Инициализация:** Компонент `<c-main-menu>` монтируется в `renderHeader()`, считывая дерево `commands: UICommand[]` из единого источника команд ядра.
2. **Отрисовка:** Формируются вкладки («создание», «редактирование») и каскадные выпадающие списки пунктов с горячими клавишами и нативными подсказками `title` (`description`).
3. **Открытие/Закрытие:** Клик по вкладке переключает выпадающее меню; клик вне компонента или выбор команды автоматически закрывает списки.
4. **Вызов действия:** Клик по конечному пункту вызывает `execute()` соответствующей `UICommand`.
