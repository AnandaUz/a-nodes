import { core } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode";
import { TransformMove } from "./TransformMove";

export class SelectManager {
  private body: HTMLElement;
  // is_mdown = false

  // p1 = {x:0,y:0}
  // p2 =  {x:0,y:0}

  // private is_on = true
  // m_sel = []
  // is_multi_sel = false
  // is_sel = false
  // is_moved = false
  // wasSelecting = false
  // wasButtons: number = 0
  // onMove
  selectedNodes = new Map<string, VNode>();

  transformMove: TransformMove = new TransformMove(this);

  onVNodeClick(e: PointerEvent, vnode: VNode) {
    if (e.ctrlKey) {
      if (vnode.isSelected) {
        this.selectedNodes.set(vnode._id, vnode);
      } else {
        this.selectedNodes.delete(vnode._id);
      }
    } else {
      this.clearSelection();
      vnode.select();
      this.selectedNodes.set(vnode._id, vnode);
    }
  }

  constructor() {
    this.body = document.createElement("elSelection");
    this.body.classList.add("selectBox");
    document.body.appendChild(this.body);

    const mainBlock = document.body;

    new SelectionRect(mainBlock, (rect, mouseEvent) => {
      if (!core.mode.selectMoving && (rect.width < 10 || rect.height < 10)) {
        this.clearSelection();
        return;
      }

      if (!core.mode.selectMoving && !mouseEvent.ctrlKey) this.clearSelection();
      core.nodeRenderer.getAllNodes().forEach((vnode) => {
        if (vnode.checkInRect(rect)) {
          if (!vnode.isSelected) {
            this.selectedNodes.set(vnode._id, vnode);
            vnode.select();
            core.mode.selectedVNodeCount = this.selectedNodes.size;
          }
        }
      });
      core.mode.selectMoving = false;
    });
  }
  clearSelection() {
    this.selectedNodes.forEach((node) => node.unselect());
    this.selectedNodes.clear();
    core.mode.selectedVNodeCount = 0;
  }
}
