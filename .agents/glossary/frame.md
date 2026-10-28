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
