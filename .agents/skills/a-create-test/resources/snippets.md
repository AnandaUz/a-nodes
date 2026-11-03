# Готовые сниппеты для сборки тестов

Использовать готовые шаблоны напрямую при поступлении соответствующих команд от пользователя без поиска по проекту.

### 1. «создай ноду» / «создать ноду»
```ts
const {{nodeName}} = createTestTextNode({
  x: {{x}},
  y: {{y}},
  container: env.container,
});
```

### 2. «сделай ребёнком» / «ребёнок»
```ts
{{childNode}}.list.initParent({{parentNode}});
```

### 3. «выделить ноду курсором» / «выдели ноду»
```ts
core.selectManager.selectNode({{nodeName}}, { ctrlKey: {{ctrlKey}} });
```

### 4. «хватаю выделенное и несу к ноде ... отпускаю» / «перетащить к ноде»
```ts
dragNode({{grabNode}}, {{targetNode}}.x, {{targetNode}}.y + 10);
```

### 5. «клик в пустое место» / «снять выделение»
```ts
clickEmptySpace();
```

### 6. «проверяем - стала ли ребёнком» / «ребёнок ноды»
```ts
expect({{childNode}}.list.parentNode).toBe({{parentNode}});
expect({{parentNode}}.list.children?.has({{childNode}})).toBe(true);
```

### 7. «опускаем / тащим с наездом на N px»
```ts
// Сверху (наезд снизу вверх или сверху вниз на верх целевой ноды: target.y - grab.height + N):
dragNode({{grabNode}}, {{targetNode}}.x, {{targetNode}}.y - 30 + {{N}});
// Снизу (наезд на низ целевой ноды: target.y + target.height - N):
dragNode({{grabNode}}, {{targetNode}}.x, {{targetNode}}.y + 30 - {{N}});
```

### 8. «отпускаю на N px выше/ниже ноды» / «сдвиг от ноды»
```ts
// На N px выше ноды (y - N):
dragNode({{grabNode}}, {{targetNode}}.x, {{targetNode}}.y - {{N}});
// На N px ниже ноды (y + N):
dragNode({{grabNode}}, {{targetNode}}.x, {{targetNode}}.y + {{N}});
```

### 9. «проверка последовательности детей» / «порядок детей»
```ts
const order: number[] = [];
{{parentNode}}.list.forEachChildren((ch) => order.push(ch.lID!));
expect(order).toEqual([{{expectedIDs}}]);
```

### 10. «реализуй тест» / «!проверь»
Запустить целевой тест:
```bash
npm --prefix client test -- <target.test.ts>
```
При наличии ошибки — отладить и исправить основную программу до прохождения теста.

---

### Необходимые импорты (подтягивать автоматически при первом использовании)
```ts
import {
  setupNodeTestEnv,
  createTestTextNode,
  dragNode,
  clickEmptySpace,
  type NodeTestEnv,
} from "./testHelpers";
import { GRID } from "@/features/core/CONST";
```
