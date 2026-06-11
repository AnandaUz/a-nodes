import { core } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode";
import { TransformMove } from "./TransformMove";

export class SelectManager {
  private body: HTMLElement;

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
    core.mode.selectedVNodeCount = this.selectedNodes.size;
  }
  selectNodyById(
    id: string,
    options?: {
      ctrlKey?: boolean;
    },
  ): VNode | null {
    const vnode = core.nodeRenderer.getVNode(id);
    if (!vnode) return null;
    if (options?.ctrlKey) {
      this.selectedNodes.set(id, vnode);
    } else {
      this.clearSelection();
      this.selectedNodes.set(id, vnode);
    }
    vnode.select();
    core.mode.selectedVNodeCount = this.selectedNodes.size;
    return vnode;
  }

  constructor() {
    this.body = document.createElement("elSelection");
    this.body.classList.add("selectBox");
    document.body.appendChild(this.body);

    const mainBlock = document.body;

    new SelectionRect(mainBlock, (rect, mouseEvent) => {
      if (!core.mode.selectMoving && (rect.width < 10 || rect.height < 10)) {
        if (!core.mode.wasMoving) {
          this.clearSelection();
        }
        core.mode.wasMoving = false;
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

  getNodeOverRect(rect: DOMRect) {
    return core.nodeRenderer.getAllNodes().filter((node) => {
      const r = node.body.getBoundingClientRect();
      return (
        r.x < rect.x + rect.width &&
        r.x + r.width > rect.x &&
        r.y < rect.y + rect.height &&
        r.y + r.height > rect.y
      );
    });
  }
  clearSelection() {
    this.selectedNodes.forEach((node) => node.unselect());
    this.selectedNodes.clear();
    core.mode.selectedVNodeCount = 0;
  }
  getSelectedNodeRect() {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

    this.selectedNodes.forEach((node) => {
      const r = node.body.getBoundingClientRect();
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.width);
      y1 = Math.max(y1, r.y + r.height);
    });

    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
  }
}
