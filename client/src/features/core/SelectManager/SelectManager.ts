import { core, EVENTS } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode";
import { TransformMove } from "./TransformMove";
import VFrame from "@/features/nodes/VFrame/VFrame";
import type { LNode } from "@/features/nodes/LNode/LNode";

export class SelectManager {
  private body: HTMLElement;
  private selectionRect!: SelectionRect;
  private _movedNodes: Set<VNode> = new Set();

  selectedNodes = new Set<LNode>();

  transformMove: TransformMove = new TransformMove(this);

  onNodeMoveEnd(node: VNode): void {
    // если несколько выделено — ждём пока все закончат
    if (this.selectedNodes.size > 1) {
      this._movedNodes.add(node);

      // все выделенные завершили движение
      if (this._movedNodes.size >= this.selectedNodes.size) {
        core.store.emit(EVENTS.node.selectedMoved, [
          ...this.selectedNodes.values(),
        ]);
        this._movedNodes.clear();
      }
    } else {
      // одна нода — сразу испускаем
      core.store.emit(EVENTS.node.selectedMoved, [node.node]);
    }
  }

  onVNodeClick(e: PointerEvent, vnode: VNode) {
    const node = vnode.node;
    if (e.ctrlKey) {
      if (node.isSelected) {
        this.selectedNodes.add(node);
      } else {
        this.selectedNodes.delete(node);
      }
    } else {
      this.clearSelection();
      vnode.select();
      this.selectedNodes.add(node);
    }
    core.mode.selectedVNodeCount = this.selectedNodes.size;
    core.store?.emit(EVENTS.node.selected, vnode.node);
  }
  // addToSelectedNodes(vnodes: VNode[]) {
  //   vnodes.forEach((vnode) => {
  //     this.selectedNodes.set(vnode.node._id || "", vnode);
  //     vnode.select();
  //   });
  //   core.mode.selectedVNodeCount = this.selectedNodes.size;
  //   // core.store?.emit(EVENTS.node.selected, vnodes[0].node);
  // }
  selectNode(
    node: LNode,
    options?: {
      ctrlKey?: boolean;
    },
  ): VNode | null {
    const vnode = node.vNode;
    if (!vnode) return null;
    if (options?.ctrlKey) {
      this.selectedNodes.add(node);
    } else {
      this.clearSelection();
      this.selectedNodes.add(node);
    }
    vnode.select();
    core.mode.selectedVNodeCount = this.selectedNodes.size;
    core.store?.emit(EVENTS.node.selected, vnode.node);
    return vnode;
  }
  selectNodeById(
    id: string,
    options?: {
      ctrlKey?: boolean;
    },
  ): VNode | null {
    const vnode = core.nodeRenderer.getVNode(id);
    if (!vnode) return null;
    const node = vnode.node;
    if (options?.ctrlKey) {
      this.selectedNodes.add(node);
    } else {
      this.clearSelection();
      this.selectedNodes.add(node);
    }
    vnode.select();
    core.mode.selectedVNodeCount = this.selectedNodes.size;
    core.store?.emit(EVENTS.node.selected, vnode.node);
    return vnode;
  }

  constructor() {
    this.body = document.createElement("elSelection");
    this.body.classList.add("selectBox");
    document.body.appendChild(this.body);

    const mainBlock = document.body;

    this.selectionRect = new SelectionRect(mainBlock, (rect, pointerEvent) => {
      if (!core.mode.selectMoving && (rect.width < 10 || rect.height < 10)) {
        if (!core.mode.wasMoving) {
          this.clearSelection();
          core.store?.emit(EVENTS.node.unselected, null);
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

      if (!core.mode.selectMoving && !pointerEvent.ctrlKey) {
        this.clearSelection();
        core.store?.emit(EVENTS.node.unselected, null);
      }
      core.nodeRenderer.getAlnodes().forEach((vnode) => {
        if (vnode instanceof VFrame) return;
        if (vnode.checkInRect(realRect)) {
          if (!vnode.node.isSelected) {
            this.selectedNodes.add(vnode.node);
            vnode.select();
            core.mode.selectedVNodeCount = this.selectedNodes.size;
          }
        }
      });
      if (this.selectedNodes.size > 0) {
        core.store?.emit(EVENTS.node.selected, null);
      }
      core.mode.selectMoving = false;
    });
  }

  unmount() {
    this.body.remove();
    this.selectionRect.destroy();
  }

  getNodeOverRect(rect: DOMRect) {
    return core.nodeRenderer
      .getAlnodes()
      .filter((node) => {
        const r = node.bodyRect;
        return (
          r.x < rect.x + rect.width &&
          r.x + r.width > rect.x &&
          r.y < rect.y + rect.height &&
          r.y + r.height > rect.y
        );
      })
      .map((n) => n.node);
  }
  clearSelection() {
    this.selectedNodes.forEach((node) => node?.vNode?.unselect());
    this.selectedNodes.clear();
    core.mode.selectedVNodeCount = 0;
  }
  // getSelectedNodeRect(withChildren = false) {
  //   let x0 = Infinity,
  //     y0 = Infinity,
  //     x1 = -Infinity,
  //     y1 = -Infinity;

  //   const nodesToMeasure = new Set(this.selectedNodes.values());
  //   if (withChildren) {
  //     const visited = new Set();
  //     const gather = (node: any) => {
  //       if (!node || visited.has(node)) return;
  //       visited.add(node);

  //       if (node.list?.children) {
  //         for (const child of node.list.children) {
  //           if (child.vNode) {
  //             nodesToMeasure.add(child.vNode);
  //           }
  //           gather(child);
  //         }
  //       }
  //     };
  //     this.selectedNodes.forEach((vNode) => {
  //       gather(vNode.node);
  //     });
  //   }
  //   nodesToMeasure.forEach((vNode) => {
  //     const r = vNode.bodyRect;
  //     x0 = Math.min(x0, r.x);
  //     y0 = Math.min(y0, r.y);
  //     x1 = Math.max(x1, r.x + r.width);
  //     y1 = Math.max(y1, r.y + r.height);
  //   });

  //   return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
  // }
}
