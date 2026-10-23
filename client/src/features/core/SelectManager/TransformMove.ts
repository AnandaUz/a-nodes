import { core } from "@/features/core/core";
import type { SelectManager } from "./SelectManager";
import Tools from "../Tools";

export class TransformMove {
  private active = false;
  private selectManager: SelectManager;
  private rafId: number | null = null;
  private lastPointerEvent: PointerEvent | null = null;

  constructor(selectManager: SelectManager) {
    this.selectManager = selectManager;
  }

  start(e?: PointerEvent) {
    if (this.selectManager.selectedNodes.size === 0) return;
    this.active = true;

    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

    const clientX = e?.clientX ?? core.desk.pointer.x;
    const clientY = e?.clientY ?? core.desk.pointer.y;
    const pointerId = e?.pointerId ?? 1;

    const pEvent = new PointerEvent("pointerdown", {
      clientX,
      clientY,
      pointerId,
      pointerType: "mouse",
      isPrimary: true,
    });
    this.selectManager.selectedNodes.forEach((node) => {
      try {
        node.vNode?.onPointerDown(pEvent);
        if (node.vNode) {
          node.vNode.isMoved = true;
        }
      } catch {}
    });
    core.mode.selectMoving = true;
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.active) return;

    core.mode.wasMoving = true;
    this.lastPointerEvent = e;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.renderMove);
    }
  };

  private renderMove = () => {
    this.rafId = null;
    if (!this.active || !this.lastPointerEvent) return;

    const e = this.lastPointerEvent;
    this.selectManager.selectedNodes.forEach((node) => {
      node.vNode?.onPointerMove(e, true);
    });
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
      this.selectManager.selectedNodes.forEach((node) => {
        node.vNode?.onPointerMove(lastEvent, true);
      });
    }

    this.selectManager.selectedNodes.forEach((node) => {
      node.vNode?.onPointerUp(e);
    });
    Tools.stopEvent(e);

    this.active = false;
    core.mode.selectMoving = false;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  };
}
