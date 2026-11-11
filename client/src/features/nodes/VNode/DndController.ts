import { core, EVENTS } from "../../core/core";
import {
  beginMoveHistoryTransaction,
  cancelMoveHistoryTransaction,
  commitMoveHistoryTransaction,
} from "../../core/commands/historyCommands";
import Tools from "../../core/Tools";
import type { VNode } from "./VNode";
import { DropSlotService } from "../DropSlotService";

interface Position {
  x: number;
  y: number;
}

const DBL_CLICK_DELAY = 300; // Максимальное время между кликами (мс)
const DBL_CLICK_DISTANCE = 5;

export class DndController {
  static showDropIndicator(x: number, y: number, width: number): void {
    DropSlotService.getInstance().showIndicator(x, y, width);
  }

  static hideDropIndicator(): void {
    DropSlotService.getInstance().hideIndicator();
  }

  private vNode: VNode;
  movingElement: HTMLElement | null = null;
  isDragging: boolean = false;
  isMoved: boolean = false;
  private pointerOffset: Position = { x: 0, y: 0 };
  private startPos: Position = { x: 0, y: 0 };
  private dragRafId: number | null = null;
  private targetPos: Position | null = null;
  private lastClickTime: number = 0;
  private lastClickPos: Position = { x: 0, y: 0 };
  private lastPointerEvent: PointerEvent | null = null;

  constructor(vNode: VNode) {
    this.vNode = vNode;
  }

  bind(element: HTMLElement) {
    this.movingElement = element;
    this.movingElement.addEventListener("pointerdown", this.onPointerDown);
    this.movingElement.addEventListener("pointermove", this.onPointerMove);
    this.movingElement.addEventListener("pointerup", this.onPointerUp);
  }

  unbind() {
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    this.targetPos = null;
    if (this.movingElement) {
      this.movingElement.removeEventListener("pointerdown", this.onPointerDown);
      this.movingElement.removeEventListener("pointermove", this.onPointerMove);
      this.movingElement.removeEventListener("pointerup", this.onPointerUp);
    }
  }

  cancelDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.isMoved = false;
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    this.targetPos = null;
    this.lastPointerEvent = null;
    core.mode.isShiftDrag = false;
    DropSlotService.getInstance().clear();
    if (!core.mode.selectMoving) {
      cancelMoveHistoryTransaction();
    }
    this.vNode.body.classList.remove("is-dragging");
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  }

  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (
      core.mode.isPinching ||
      Date.now() - core.mode.lastPinchEndTime < 300
    ) {
      return;
    }
    const textEdit = this.vNode.node as unknown as {
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
    if (core.mode.textEditing) {
      if (this.vNode.node.isSelected) return;
      // если режим редактирования, то клик по ноде переходит в редактирование
      // core.selectManager.clearSelection();
      core.selectManager.selectNode(this.vNode.node, { ctrlKey: false });
      // this.select();
      this.vNode.onDoubleClick(e);
      core.mode.textEditing = true;
      return;
    }
    if (core.mode.selectMoving && core.mode.selectedVNodeCount > 1) return;

    // --- КАТАЛИЗАТОР ДВОЙНОГО КЛИКА ---
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastClickTime;

    // Проверяем расстояние между первым и вторым кликом (на случай если пользователь дернул мышкой)
    const distance = Math.hypot(
      e.clientX - this.lastClickPos.x,
      e.clientY - this.lastClickPos.y,
    );

    if (timeDiff < DBL_CLICK_DELAY && distance < DBL_CLICK_DISTANCE) {
      this.vNode.onDoubleClick(e); // Вызываем наш кастомный метод двойного клика
      return; // Прерываем выполнение, чтобы не начинать тащить ноду при двойном клике
    }

    // Сохраняем текущее время и координаты для следующей проверки
    this.lastClickTime = currentTime;
    this.lastClickPos = { x: e.clientX, y: e.clientY };
    // ---------------------------------

    this.isMoved = false;

    Tools.stopEvent(e);

    this.lastPointerEvent = e;
    core.mode.isShiftDrag = Boolean(e.shiftKey || core.mode.mouseStatus.shift);
    this.isDragging = true;
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    this.targetPos = null;
    // core.store.emit(EVENTS.node.pointer.down, this);

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    this.pointerOffset = {
      x: worldPos.x - (this.vNode.node.x || 0),
      y: worldPos.y - (this.vNode.node.y || 0),
    };

    this.startPos = { x: this.vNode.node.x, y: this.vNode.node.y };
    beginMoveHistoryTransaction([
      this.vNode.node,
      ...(core.selectManager?.selectedNodes ?? []),
    ]);

    const targetElement =
      this.movingElement || this.vNode.movingElement || this.vNode.body;
    try {
      targetElement?.setPointerCapture(e.pointerId);
    } catch {}
  };

  flushDragMove() {
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    if (!this.targetPos) return;

    this.vNode.node.x = this.targetPos.x;
    this.vNode.node.y = this.targetPos.y;
    this.targetPos = null;

    const isShift = Boolean(
      this.lastPointerEvent?.shiftKey ||
        core.mode.mouseStatus.shift ||
        core.mode.isShiftDrag,
    );
    const hasMovingChildren = Boolean(
      this.vNode.node.list.children?.size && !isShift,
    );

    this.vNode.applyPosition(hasMovingChildren);
    core.store.emit(EVENTS.node.moving, this.vNode.node);

    // если у него есть дети
    if (hasMovingChildren) {
      this.vNode.node.list.setPositionForChildren(undefined, 0, 0, true, true);
    }

    const movedSet = new Set<any>(
      core.selectManager?.selectedNodes.size
        ? core.selectManager.selectedNodes
        : [this.vNode.node],
    );
    DropSlotService.getInstance().update(movedSet, isShift);
  }

  private applyDragMove = () => {
    this.dragRafId = null;
    this.flushDragMove();
  };

  onPointerMove = (e: PointerEvent, fromTransform = false) => {
    if (!this.isDragging) return;
    if (
      core.mode.isPinching ||
      Date.now() - core.mode.lastPinchEndTime < 300
    ) {
      this.cancelDrag();
      return;
    }

    if (
      this.vNode.node.isSelected &&
      core.selectManager.selectedNodes.size > 1 &&
      !core.mode.selectMoving
    ) {
      core.selectManager.transformMove.start(e, {
        x: this.startPos.x + this.pointerOffset.x,
        y: this.startPos.y + this.pointerOffset.y,
      }); //если выбранно несколько

      return;
    }

    if (core.mode.selectMoving && !fromTransform) {
      return;
    }

    if (!this.vNode.node.isSelected) {
      if (!core.mode.inputMode.coarse) {
        core.selectManager.onVNodeClick(e, this.vNode);
      }

      // this.select();
    }

    this.lastPointerEvent = e;
    if (e.shiftKey || core.mode.mouseStatus.shift) {
      core.mode.isShiftDrag = true;
    }
    this.isMoved = true;
    this.vNode.body.classList.add("is-dragging");

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    let x = Math.round(worldPos.x - this.pointerOffset.x);
    if (1) {
      x = Tools.getDiskPosition(x);
    }
    const y = Math.round(worldPos.y - this.pointerOffset.y);

    this.targetPos = { x, y };

    if (fromTransform) {
      this.flushDragMove();
    } else if (this.dragRafId === null) {
      this.dragRafId = requestAnimationFrame(this.applyDragMove);
    }
  };

  onPointerUp = (e: PointerEvent) => {
    if (!this.isDragging) return;
    this.lastPointerEvent = e;
    if (e.shiftKey || core.mode.mouseStatus.shift) {
      core.mode.isShiftDrag = true;
    }
    if (
      core.mode.isPinching ||
      Date.now() - core.mode.lastPinchEndTime < 300
    ) {
      this.cancelDrag();
      return;
    }
    this.flushDragMove();
    DndController.hideDropIndicator();
    this.vNode.body.classList.remove("is-dragging");
    this.isDragging = false;
    if (!this.isMoved && !core.mode.selectMoving) {
      cancelMoveHistoryTransaction();
      this.vNode.toggleSelect();
      core.selectManager.onVNodeClick(e, this.vNode);
      return;
    }
    this.vNode.node.moveTo({ x: this.vNode.node.x, y: this.vNode.node.y });

    core.store.emit(EVENTS.node.moved, this.vNode.node);

    core.selectManager.onNodeMoveEnd(this.vNode);
    commitMoveHistoryTransaction([this.vNode.node]);

    if (core.selectManager.selectedNodes.size <= 1) {
      core.mode.selectMoving = false;
    }

    this.vNode.onStop();
  };
}
