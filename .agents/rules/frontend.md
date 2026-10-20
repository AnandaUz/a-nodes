---
description: Client-side TypeScript and canvas architecture rules
globs: "client/**/*"
scope: "client/**/*"
---

# Client & Canvas Directives

- **Frameworks:** No React, Vue, or Tailwind. Native DOM, TypeScript, SVG, and SCSS only.
- **Model-View Separation:**
  - [LNode](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/LNode/LNode.ts): Encapsulates node data, hierarchy, position calculations, and invariants.
  - [VNode](file:///d:/_sites/a-node(v.AI)/client/src/features/nodes/VNode/VNode.ts): View only. Handles DOM rendering, CSS classes, and user event dispatch. No business logic or hierarchy mutation inside VNode.
- **Security (XSS):**
  - Never assign raw input to `innerHTML`. Use `textContent` or escape HTML characters (`&`, `<`, `>`, `"`, `'`) before converting linebreaks to `<br/>`.
- **Canvas & Spatial Outliner:**
  - Strict adherence to horizontal indent: `GRID.x = 50px`.
  - SVG connections between frames/nodes must use [Ge_Path](file:///d:/_sites/a-node(v.AI)/client/src/features/canvas/Ge_Path.ts) Bezier curve logic.
- **State & Undo/Redo:**
  - All graph mutations (create, delete, reparent, indent, edit text) must execute via [ICommand](file:///d:/_sites/a-node(v.AI)/client/src/features/core/History.ts) registered in `core.history`.
- **Server Sync:**
  - Do not trigger immediate HTTP requests on node changes. Mark nodes `dirty` and allow debounced batch synchronization.
