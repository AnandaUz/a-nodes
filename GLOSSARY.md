# Glossary

Paths relative to `client/src/features/` unless noted.

## Фрейм / Frame

A text edit node (`LNode_TextEdit`) with frame mode enabled (`frame.isFrame = true`). Can have child frames linked via `Ge_Path`. Nodes inside (`list.children`) gain power buttons to toggle clones (`LNode_TEClone`) across child frames.

### Term Mapping

- **фрейм**: `LNode_TextEdit` (`frame.isFrame === true`)
- **родительский фрейм**: `frame.parents` (`Set<{node, path}>`), IDs in `frame.parentsLID`
- **дочерний фрейм**: `frame.children` (`Set<LNode_TextEdit>`)
- **узел во фрейме**: Node where `list.mainParent` is frame (`frame.isInFrame`, CSS `.in-frame`)
- **кнопки включения**: `.el-frame-power-btns .sub .btn-<frameLID>` (active = clone exists in that frame)
- **Add frame button**: `.el-frame-btn .btn.ico-plus`

### Code References

- **Logic**:
  - `nodes/LNode/TFrame.ts` — Core logic on `LNode_TextEdit.frame`.
  - `nodes/LNode/LNode_TextEdit.ts` — Frame owner, calls `frame.redrawPaths()`.
  - `nodes/LNode/LNode_TEClone.ts` — Frame child clone referencing `clones.mainNode`.
  - `nodes/LNode/LNode.ts` — Base tree hierarchy (`list.mainParent`, children).
- **View / CSS**:
  - `nodes/VNode/VTextEdit.ts` — UI rendering & event handlers (`turnOn_frameMode`, power buttons).
  - `nodes/VNode/vNode.scss` — Classes: `.frame`, `.in-frame`, `.el-frame-power-btns`, `.el-frame-btn`.
- **Managers / DB**:
  - `nodes/NodeManager.ts` — Legacy type adaptation (`NODE_TYPES.FRAME.main = 201`/`21`), clone management.
  - `shared/types/ILNode.ts` — `IFrame` interface (`isFrame`, `parents`, `pack()`, `parentsLID`).
  - `shared/types/INodeDB.ts` — DB field `f` (serialized `parentsLID`), `isFrame` accessors.
  - `desk/DeskSVG/Ge_Path.ts` — Connecting SVG bezier path between frames.

### Lifecycle

1. **Creation**: `+` button -> `TFrame.addFrame()` creates copy via `NodeManager.copyNode`, links with `Ge_Path`, activates frame mode, calls `initBtns()`.
2. **Persistence**: Saves `f` (`parentsLID`) and `isFrame` in DB.
3. **Hydration**: `TFrame.init()` restores parent/child links via `parentsLID` and re-renders SVG paths.
4. **Cloning**: Power button click invokes `addCloneOfNode()` or `clones.removeAllClones()`.

---

## листГруппа / Group

A hierarchy of nodes connected via `TList` (`node.list`). If the root parent (`list.mainParent`) is in frame mode (`frame.isFrame === true`), the group behaves as an in-frame item tree.

### Term Mapping

- **Root/Parent**: `node.list.parent` or `node.list.mainParent`
- **Children**: `node.list.children`
- **In-frame Group**: A group where `list.mainParent.frame.isFrame === true`

### Code References

- **Logic**:
  - `nodes/LNode/TList.ts` — Core tree management (parent, children, order, tabs).
  - `nodes/LNode/LNode.ts` — Holds `node.list = new TList(this)`.
- **Managers / DB**:
  - `shared/types/ILNode.ts` — `ITList` interface (`parentLID`, `index`, `tab`).
  - `shared/types/INodeDB.ts` — DB mapping for hierarchy properties.

### Lifecycle

1. **Attachment**: Nodes are attached via `list.setParent()`.
2. **Reordering**: Drag-and-drop or indent changes update `list.index` / `list.tab`.
3. **Traversal**: Operations recursively iterate using `list.forEachChildren()`.

---

## Подфрейм / Subframe

A child frame connected to a parent frame via `TFrame` (`frame.parents` / `frame.children`) and drawn with `Ge_Path`.

### Term Mapping

- **Subframe**: A frame node present in parent frame's `frame.children`.
- **Link path**: `Ge_Path` connecting parent and subframe.

### Code References

- **Logic**:
  - `nodes/LNode/TFrame.ts` — Manages `parents`, `children`, and `redrawPaths()`.
- **View**:
  - `desk/DeskSVG/Ge_Path.ts` — SVG connector between frame bounds.

### Lifecycle

1. **Creation**: Added via parent's `+` button (`TFrame.addFrame()`).
2. **Linking**: Linked to parent's `children` set, registered in `parentsLID`. Manual: drag from `.el-frame-link` (`desk/FrameLinkDrag.ts`) onto a parent frame -> `TFrame.linkToParent()` (duplicates/self/cycles ignored; many parents/children allowed).
3. **Unlink**: click `Ge_Path` (selected) + `X`/`Delete` -> `TFrame.unlinkFromParent()` (clones untouched).
4. **Sync**: Position changes trigger `redrawPaths()` on both ends.

---

## Клон / Clone

A logical clone node (`LNode_TEClone`) synchronized with its original main node via `TClones`.

### Term Mapping

- **Clone Node**: `LNode_TEClone` (instantiated in subframes).
- **Original Node**: Referenced by `clones.mainNode`.
- **Clones Registry**: Set of clones tracked in `mainNode.clones.clones`.

### Code References

- **Logic**:
  - `nodes/LNode/TClones.ts` — Clone synchronization, referencing, and batch removal.
  - `nodes/LNode/LNode_TEClone.ts` — Clone model extending `LNode_TextEdit`.
  - `nodes/LNode/LNode.ts` — Holds `node.clones = new TClones(this)`.
- **View**:
  - `nodes/VNode/VTextEditClone.ts` — UI rendering for clone nodes.
- **Managers**:
  - `nodes/NodeManager.ts` — `create_TextEditCloneNode()`, `initCloneLinks()`.

### Lifecycle

1. **Spawn**: Generated via frame power button (`TFrame.addCloneOfNode()`).
2. **Registration**: Linked to `mainNode.clones` and assigned to target subframe.
3. **Deletion**: Deleting clone toggles off parent frame power button; deleting main removes all clones.
