---
name: a-webComponent
description: Создает нативный веб-компонент на Custom Elements с изолированными файлами TS, HTML и стилей в отдельной папке.
---

# Создание веб-компонента (Custom Elements)

Инструкция и сниппеты для генерации нативного веб-компонента с инкапсуляцией через Shadow DOM и модульным разделением файлов.

## Структура папки компонента

Компонент размещается в отдельной папке (например, `client/src/components/<kebab-name>/`):

```text
<kebab-name>/
├── <kebab-name>.ts       # Класс Custom Element, логика и жизненный цикл
├── <kebab-name>.html     # HTML-шаблон компонента
├── <kebab-name>.scss     # Стили Shadow DOM (:host, селекторы)
└── index.ts              # Регистрация и реэкспорт
```

---

## Сниппеты базового кода

### 1. HTML-шаблон (`<kebab-name>.html`)
```html
<div class="container">
  <header class="header">
    <slot name="title">Заголовок по умолчанию</slot>
  </header>
  <main class="content">
    <slot></slot>
  </main>
</div>
```

### 2. Стили (`<kebab-name>.scss`)
```scss
:host {
  display: block;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: var(--bg-surface, #ffffff);
  color: var(--text-color, #1a1a1a);
}

.header {
  font-weight: 600;
}
```

### 3. TypeScript логика (`<kebab-name>.ts`)
> **Правило:** без parameter properties в конструкторе и без `enum` (согласно правилам `erasableSyntaxOnly`).

```typescript
import htmlContent from './<kebab-name>.html?raw';
import styleContent from './<kebab-name>.scss?inline';

const template = document.createElement('template');
template.innerHTML = `<style>${styleContent}</style>${htmlContent}`;

export class CustomComponent extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['title'];
  }

  private isInitialized: boolean = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (!this.isInitialized) {
      this.render();
      this.isInitialized = true;
    }
  }

  disconnectedCallback(): void {
    // Очистка слушателей и ресурсов при удалении из DOM
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    this.handleAttributeChange(name, newValue);
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));
  }

  private handleAttributeChange(name: string, value: string | null): void {
    // Реакция на изменение атрибутов
  }
}
```

### 4. Точка входа и регистрация (`index.ts`)
```typescript
import { CustomComponent } from './<kebab-name>.ts';

export const COMPONENT_TAG = '<kebab-name>';

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, CustomComponent);
}

export { CustomComponent };
```

---

## Чек-лист создания

1. Выбрать имя компонента в формате kebab-case с дефисом (требование Custom Elements, например: `user-card`).
2. Создать каталог компонента.
3. Добавить `<kebab-name>.html`, `<kebab-name>.scss`, `<kebab-name>.ts` и `index.ts`.
4. Зарегистрировать тег через `customElements.define`.
5. Проверить сборку через `npm run build:client`.

