# Задачи: Clipboard

Файл: `client/src/features/core/Clipboard.ts` (класс `Clipboard`, доступ: `core.clipboard`).
Формат: `text/plain` + `text/html` с `data-a-nodes` (JSON `{type:"a-nodes", nodes: INodeDB[]}`).

## Задачи
- [ ] (добавь задачи сюда)

## Заметки
- `copyVNode(nodes: LNode[])` — копирует выделенные; parent-связь сбрасывается, если родитель не выбран.
- `paste()` — возвращает `{nodes}` либо `{text}`.
