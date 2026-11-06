## хлебныеКрошки / Breadcrumbs

Управляющий навигационный элемент в шапке приложения, отображающий текущий уровень вложенности досок с переходом по предкам и логотипом-ссылкой на главную.

### Term Mapping

- **хлебныеКрошки**: Компонент `<c-breadcrumbs>` (`CBreadcrumbs`) с цепочкой предков до текущей открытой доски.
- **лого**: `<a href="/" class="logo">` — постоянная корневая ссылка на главную страницу / корневой деск.
- **разделитель**: Шеврон-стрелка `>` (`stroke: #FF7700`) между звеньями цепочки.
- **активный пункт**: Последний элемент цепочки (`color: #fb2600`), отображающий текущую страницу/доску.

### Code References

- **Logic**:
  - `client/src/features/breadcrumbs/breadcrumbsService.ts` — Хранилище цепочки, подписка и реактивное обновление при переходах и смене заголовков.
  - `client/src/router.ts` — Сброс/настройка цепочки при переходах между разделами и главной.
- **View / CSS**:
  - `client/src/components/c-breadcrumbs/c-breadcrumbs.ts` — Web Component на Custom Elements (`<c-breadcrumbs>`).
  - `client/src/components/c-breadcrumbs/c-breadcrumbs.scss` — Стили звеньев (`#ff8f20`, `#fb2600`, шрифт Montserrat 13px) и SVG-разделителей.
  - `client/src/components/header.ts` — Размещение логотипа и компонента в `.logo-bl`.
- **DB / Manager / Server**:
  - `server/src/services/node.service.ts` — Рекурсивное восстановление цепочки предков через `pageId` ноды страницы при загрузке деска.
  - `server/src/controllers/node.controller.ts` — Передача `breadcrumbs` в ответе API деска.
  - `client/src/features/core/serverPersistence.ts` — Сохранение и считывание `breadcrumbs` в `DeskSnapshot` и IndexedDB кэше.

### Lifecycle

1. **Инициализация / Маршрут**: При открытии роута или загрузке деска с сервера/кэша `breadcrumbsService` получает цепочку предков.
2. **Отображение View**: `<c-breadcrumbs>` рендерит кликабельные ссылки на родительские доски и подсвеченный текущий элемент.
3. **Навигация**: Клик по звену вызывает `router.navigate(url)`, клик по логотипу возвращает на главную `/`.
4. **Обновление заголовка**: При переименовании ноды текущего деска `core.store` на лету обновляет название в `breadcrumbsService`.

