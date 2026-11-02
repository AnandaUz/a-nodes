# Готовые сниппеты для сборки тестов

Использовать готовые шаблоны напрямую при поступлении соответствующих команд от пользователя без поиска по проекту.

### 1. «создай ноду» / «создать ноду»
```ts
const {{nodeName}} = new LNode_TextEdit();
{{nodeName}}.x = {{x}};
{{nodeName}}.y = {{y}};
{{nodeName}}.vNode = new VTextEdit({{nodeName}}, container);
{{nodeName}}.vNode.init();
{{nodeName}}.vNode.width = 100;
{{nodeName}}.vNode.height = 30;
core.nodeManager.nodes.add({{nodeName}});
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
const grabNode = {{grabNode}};
const targetNode = {{targetNode}};
const targetX = targetNode.x;
const targetY = targetNode.y + 10;

core.desk.pointer = { x: grabNode.x, y: grabNode.y };
grabNode.vNode?.onPointerDown(
  new PointerEvent("pointerdown", {
    clientX: grabNode.x,
    clientY: grabNode.y,
    button: 0,
    pointerId: 1,
  })
);

// Начало движения в точке захвата (стартует TransformMove)
grabNode.vNode?.onPointerMove(
  new PointerEvent("pointermove", {
    clientX: grabNode.x + 1,
    clientY: grabNode.y + 1,
    button: 0,
    pointerId: 1,
  })
);

// Перемещение через TransformMove к цели
core.desk.pointer = { x: targetX, y: targetY };
window.dispatchEvent(
  new PointerEvent("pointermove", {
    clientX: targetX,
    clientY: targetY,
    button: 0,
    pointerId: 1,
  })
);

const upEvent = new PointerEvent("pointerup", {
  clientX: targetX,
  clientY: targetY,
  button: 0,
  pointerId: 1,
});
window.dispatchEvent(upEvent);
```

---

### Необходимые импорты (подтягивать автоматически при первом использовании)
```ts
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { GRID } from "@/features/core/CONST";
```

