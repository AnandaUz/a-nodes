import { core, EVENTS } from "@/features/core/core";
import type { SelectManager } from "./SelectManager";
import Tools from "../Tools";
import {
  beginMoveHistoryTransaction,
  commitMoveHistoryTransaction,
} from "../commands/historyCommands";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { DropSlotService } from "@/features/nodes/DropSlotService";

export class TransformMove {
  private active = false;
  private selectManager: SelectManager;
  private rafId: number | null = null;
  private lastPointerEvent: PointerEvent | null = null;
  private startWorld = { x: 0, y: 0 };
  private startPositions = new Map<LNode, { x: number; y: number }>();

  constructor(selectManager: SelectManager) {
    this.selectManager = selectManager;
  }

  start(e?: PointerEvent, initialWorld?: { x: number; y: number }) {
    if (this.selectManager.selectedNodes.size === 0) return;
    this.active = true;
    this.startPositions.clear();

    const clientX = e?.clientX ?? core.desk.pointer.x;
    const clientY = e?.clientY ?? core.desk.pointer.y;
    this.startWorld =
      initialWorld ?? core.desk.viewport.screenToWorld(clientX, clientY);

    this.selectManager.selectedNodes.forEach((node) => {
      this.startPositions.set(node, { x: node.x, y: node.y });
      if (node.vNode) {
        node.vNode.cancelDrag();
        node.vNode.isMoved = true;
        node.vNode.body.classList.add("is-dragging");
      }
    });
    beginMoveHistoryTransaction(this.selectManager.selectedNodes);

    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    core.mode.selectMoving = true;

    if (e) {
      this.lastPointerEvent = e;
      this.applyMove(e);
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.active) return;

    core.mode.wasMoving = true;
    this.lastPointerEvent = e;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.renderMove);
    }
  };

  private applyMove(e: PointerEvent) {
    if (e.shiftKey || core.mode.mouseStatus.shift) {
      core.mode.isShiftDrag = true;
    }
    const currentWorld = core.desk.viewport.screenToWorld(e.clientX, e.clientY);
    const dx = currentWorld.x - this.startWorld.x;
    const dy = currentWorld.y - this.startWorld.y;
    const isShift = Boolean(
      e.shiftKey || core.mode.mouseStatus.shift || core.mode.isShiftDrag,
    );

    const rootNodesToMove = new Set<LNode>();
    this.selectManager.selectedNodes.forEach((node) => {
      if (!isShift) {
        let p = node.list.parentNode;
        let hasSelectedAncestor = false;
        while (p) {
          if (this.selectManager.selectedNodes.has(p)) {
            hasSelectedAncestor = true;
            break;
          }
          p = p.list.parentNode;
        }
        if (hasSelectedAncestor) return;
      }
      rootNodesToMove.add(node);
    });

    rootNodesToMove.forEach((node) => {
      const startPos = this.startPositions.get(node);
      if (!startPos) return;
      node.x = Tools.getDiskPosition(Math.round(startPos.x + dx));
      node.y = Math.round(startPos.y + dy);

      const hasMovingChildren = Boolean(node.list.children?.size && !isShift);
      node.vNode?.applyPosition(hasMovingChildren);
      core.store.emit(EVENTS.node.moving, node);

      if (hasMovingChildren) {
        node.list.setPositionForChildren(undefined, 0, 0, true, true);
      }
    });

    DropSlotService.getInstance().update(
      this.selectManager.selectedNodes,
      isShift,
    );
  }

  private renderMove = () => {
    this.rafId = null;
    if (!this.active || !this.lastPointerEvent) return;
    this.applyMove(this.lastPointerEvent);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.active) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.lastPointerEvent) {
      const lastEvent = this.lastPointerEvent;
      this.lastPointerEvent = null;
      this.applyMove(lastEvent);
    }

    Tools.stopEvent(e);
    DropSlotService.getInstance().hideIndicator();

    const movedList: LNode[] = [];
    this.startPositions.forEach((_startPos, node) => {
      node.vNode?.body.classList.remove("is-dragging");
      node.moveTo({ x: node.x, y: node.y });
      core.store.emit(EVENTS.node.moved, node);
      node.vNode?.onStop();
      movedList.push(node);
    });
    this.startPositions.clear();

    this.active = false;
    core.mode.selectMoving = false;
    core.mode.wasMoving = false;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);

    if (movedList.length > 0) {
      core.store.emit(EVENTS.node.selectedMoved, movedList);
    }
    commitMoveHistoryTransaction(movedList);
  };
}
