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
