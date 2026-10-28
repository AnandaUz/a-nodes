## быстраяЗапись / быстрыеЗаметки / Quick Notes

Механизм и API-эндпоинт для оперативного создания текстовых нод из внешних источников без открытия интерфейса доски.

### Term Mapping

- **быстраяЗапись / быстрыеЗаметки**: Создание и получение целевых нод через `GET /nodes/quick-targets` и `POST /nodes/quick-add`.
- **Маркер приемника**: `>>` в `title` ноды (обозначает контейнер для внешней записи).
- **API-ключ**: `API_SECRET_KEY` (передается через заголовок `x-api-key` или `Bearer`).
- **Контроллер**: `quickAddNodeController`, `getQuickTargetsController` в `server/src/controllers/node.controller.ts`.
- **Дефолтные параметры**: `pageId: 6a217eec3f6bb77979b18240`, `type: 1`, `L: 4456625` (`parentLID: 136`, `tab: 1`, начальный `index: 22`).

### Code References

- **Logic / Controller**:
  - `server/src/controllers/node.controller.ts` — `getQuickTargetsController` (выборка целевых нод по `>>`), `quickAddNodeController` (резолв `parentTitle`, упаковка `L`, сохранение).
  - `server/src/routes/node.routes.ts` — Маршруты `GET /quick-targets`, `POST /quick-add`.
- **DB / Model**:
  - `server/src/models/Node.ts` — Модель документа `Node` (`title`, `type = 1`, битовая маска `L`, `pageId`, `s`).

### Lifecycle

1. **Target Discovery**: Клиент запрашивает `GET /nodes/quick-targets` и получает список нод с маркером `>>`.
2. **Request**: Клиент отправляет `POST /nodes/quick-add` с текстом и `parentTitle`.
3. **Auth & Resolution**: Проверяется `API_SECRET_KEY`, находится родительская нода, определяется/назначается её `lID` (в поле `s`).
4. **Index Calculation**: Вычисляется следующий `index` в конце списка детей родителя и упаковывается поле `L`.
5. **Persistence**: Создается и сохраняется дочерняя нода `Node` в БД.
