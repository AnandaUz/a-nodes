import { core, EVENTS } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode";
import { TransformMove } from "./TransformMove";
import VM_area from "@/features/nodes/VManager/VM_area";

export class SelectManager {
  private body: HTMLElement;
  private selectionRect!: SelectionRect;

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
    core.store?.emit(EVENTS.nodes.selected, vnode.nodeEss);
  }
  selectNodeById(
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
    core.store?.emit(EVENTS.nodes.selected, vnode.nodeEss);
    return vnode;
  }

  constructor() {
    this.body = document.createElement("elSelection");
    this.body.classList.add("selectBox");
    document.body.appendChild(this.body);

    const mainBlock = document.body;

    this.selectionRect = new SelectionRect(mainBlock, (rect, mouseEvent) => {
      if (!core.mode.selectMoving && (rect.width < 10 || rect.height < 10)) {
        if (!core.mode.wasMoving) {
          this.clearSelection();
          core.store?.emit(EVENTS.nodes.unselected, null);
        }
        core.mode.wasMoving = false;
        return;
      }
      const realRect = {
        x: (rect.x - core.desk.viewport.state.x) / core.mode.scale,
        y: (rect.y - core.desk.viewport.state.y) / core.mode.scale,
        width: rect.width / core.mode.scale,
        height: rect.height / core.mode.scale,
      } as DOMRect;

      if (!core.mode.selectMoving && !mouseEvent.ctrlKey) {
        this.clearSelection();
        core.store?.emit(EVENTS.nodes.unselected, null);
      }
      core.nodeRenderer.getAllNodes().forEach((vnode) => {
        if (vnode instanceof VM_area) return;
        if (vnode.checkInRect(realRect)) {
          if (!vnode.isSelected) {
            this.selectedNodes.set(vnode._id, vnode);
            vnode.select();
            core.mode.selectedVNodeCount = this.selectedNodes.size;
          }
        }
      });
      if (this.selectedNodes.size > 0) {
        core.store?.emit(EVENTS.nodes.selected, null);
      }
      core.mode.selectMoving = false;
    });
  }

  unmount() {
    this.body.remove();
    this.selectionRect.destroy();
  }

  getNodeOverRect(rect: DOMRect) {
    return core.nodeRenderer.getAllNodes().filter((node) => {
      const r = node.bodyRect;
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

    this.selectedNodes.forEach((vNode) => {
      const r = vNode.bodyRect;
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.width);
      y1 = Math.max(y1, r.y + r.height);
    });

    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
  }
}
