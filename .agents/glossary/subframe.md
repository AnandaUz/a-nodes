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
