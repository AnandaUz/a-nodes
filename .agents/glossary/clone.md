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
