## Клон / Clone

A logical clone node (`LNode_TEClone`) synchronized with its original main node via `TClones`.

### Term Mapping

- **Clone Node**: `LNode_TEClone` (instantiated in subframes / cross-page projections).
- **Original Node**: Referenced by `clones.mainNode` and global `clones.sourceNodeId` (DB field `c`).
- **Clones Registry**: Set of clones tracked in `mainNode.clones.nodes`.
- **DB Field `c`**: Single-letter field storing source node ObjectId (`sourceNodeId`), replacing local-only `lID` binding.

### Code References

- **Shared / DB**:
  - `shared/types/INodeDB.ts` — `c` field (source node ObjectId), `toDB` / `fromDB`.
  - `server/src/models/Node.ts` — Mongoose schema definition with index `{ c: 1 }`.
- **Logic**:
  - `nodes/LNode/TClones.ts` — Clone synchronization, `sourceNodeId`, and batch removal.
  - `nodes/LNode/LNode_TEClone.ts` — Clone model extending `LNode_TextEdit`, read-through projection with `_cachedTitle`.
  - `nodes/LNode/LNode.ts` — Holds `node.clones = new TClones(this)`.
- **View**:
  - `nodes/VNode/VTextEditClone.ts` — UI rendering for clone nodes.
- **Managers & Sync**:
  - `nodes/NodeManager.ts` — `create_TextEditCloneNode()`, `initCloneLinks()`.
  - `nodes/nodeHierarchy.ts` — `initCloneLinks()` resolves by `sourceNodeId` (`c`) first, then `mainNodeLID`.
  - `server/src/services/node.service.ts` — Hydrates missing clone sources on page load.
  - `server/src/controllers/node.controller.ts` — SSE multi-desk dispatch via `c`.

### Lifecycle

1. **Spawn**: Generated via frame power button (`TFrame.addCloneOfNode()`) or clipboard copy. Sets global `sourceNodeId` (`c`).
2. **Registration**: Linked to `mainNode.clones` and assigned to target subframe or desk tree.
3. **Cross-page Hydration**: If clone source is on another page, server automatically fetches source node by `c` on desk fetch.
4. **Reactive Sync**: Modifying source broadcasts `nodes_updated` via SSE to all desks holding its clones (`c: sourceId`).
5. **Deletion**: Deleting clone toggles off parent frame power button; deleting main removes all clones.
