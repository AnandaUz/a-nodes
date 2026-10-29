import { core, EVENTS } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode/VNode";
import { TransformMove } from "./TransformMove";
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
    const textEdit = node as unknown as {
      frame?: {
        isFrame: boolean;
        frameNode?: { frame?: { bringToFront(): void } };
        bringToFront(): void;
      };
    };
    if (textEdit.frame) {
      if (textEdit.frame.isFrame) {
        textEdit.frame.bringToFront();
      } else if (textEdit.frame.frameNode?.frame) {
        textEdit.frame.frameNode.frame.bringToFront();
      }
    }
    if (e.ctrlKey) {
      if (node.isSelected) {
        this.selectedNodes.add(node);
      } else {
        this.selectedNodes.delete(node);
      }
    } else {
      this.clearSelection();
      node.select();
      this.selectedNodes.add(node);
    }
    core.mode.selectedVNodeCount = this.selectedNodes.size;
    core.store?.emit(EVENTS.node.selected, vnode.node);
  }
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
  unselectNode(node: LNode) {
    if (this.selectedNodes.has(node)) {
      node.unselect();
      this.selectedNodes.delete(node);
      core.mode.selectedVNodeCount = this.selectedNodes.size;
      core.store?.emit(EVENTS.node.unselected, node);
    }
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
      core.nodeManager.searchInRect(realRect).forEach((node) => {
        if (node.vNode?.checkInRect(realRect)) {
          if (!node.isSelected) {
            this.selectedNodes.add(node);
            node.select();
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
    return core.nodeManager.searchInRect(rect).filter((node) => {
      const r = node.vNode?.bodyRect;
      if (!r) return false;
      return (
        r.x < rect.x + rect.width &&
        r.x + r.width > rect.x &&
        r.y < rect.y + rect.height &&
        r.y + r.height > rect.y
      );
    });
  }
  clearSelection() {
    this.selectedNodes.forEach((node) => node?.unselect());
    this.selectedNodes.clear();
    core.mode.selectedVNodeCount = 0;
  }
}
