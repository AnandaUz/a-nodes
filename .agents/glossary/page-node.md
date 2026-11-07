## нодаСтраница / Page Node

Узел типа страница (`LNode_Page`, `VPage`), содержащий ссылку (`url` / `pageId`) и кнопку перехода на другую доску.

### Term Mapping

- **нодаСтраница**: Узел типа страница (`LNode_Page`, `VPage`, `type: 4`, CSS `.v-n-page`).
- **кнопка перехода**: `.btn-el` (`🔗`) — клик/тап осуществляет переход на целевую доску.
- **адрес доски**: `url` в `node.exData?.url` или `/desk/<_id>`.
- **исходящие группы (`out`)**: Слепок `OUT`-фреймов страницы в корневом поле `node.out` (`IOutFrameData[]`) и битовом поле `P` (`selectedOutLID`, `outLimit`).
- **разделитель группы**: Узел `.out-group-header` (`isOutGroupHeader: true`) с названием `OUT`-фрейма и линией.

### Code References

- **Logic**:
  - `nodes/LNode/LNode_Page.ts` — Модель узла страницы, наследует `LNode_TextEdit`, возвращает `VPage`.
  - `nodes/node-registry.ts` — Регистрация типа (`NODE_TYPES.PAGE.id = 3`).
- **View / CSS**:
  - `nodes/VNode/VPage.ts` — Представление узла, обработчики кнопки перехода `.btn-el`.
  - `nodes/VNode/vNode.scss` — Классы `.v-n-page`, `.btn-el`.
- **DB / Manager**:
  - `nodes/NodeManager.ts` — Поле `pageNode`, создание и адаптация узла страницы.

### Lifecycle

1. **Создание**: Добавляется через `NodeManager.addNode(NODE_TYPES.PAGE.id)`.
2. **Инициализация View**: `VPage` монтирует кнопку `.btn-el` (`🔗`) и настраивает слушатели клика/тапа с защитой от жестов навигации.
3. **Навигация**: Клик или тап по `.btn-el` формирует маршрут `/desk/<id>` и вызывает `app.router.navigate(url)` (или открытие в новой вкладке при middle-click).
