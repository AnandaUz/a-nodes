import { core } from "@/features/core/core";
import type { SelectManager } from "./SelectManager";
import Tools from "../Tools";

export class TransformMove {
  private active = false;
  // private startMouse = { x: 0, y: 0 };
  //   private startPositions: Map<string, { x: number; y: number }> = new Map();
  private selectManager: SelectManager;

  constructor(selectManager: SelectManager) {
    this.selectManager = selectManager;
  }

  start() {
    if (this.selectManager.selectedNodes.size === 0) return;
    this.active = true;

    window.addEventListener("pointermove", this.onMouseMove);
    window.addEventListener("pointerup", this.onMouseUp);

    const pEvent = new PointerEvent("pointerdown", {
      clientX: core.desk.mouse.x,
      clientY: core.desk.mouse.y,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerDown(pEvent);
    });
    core.mode.selectMoving = true;

    // this.startMouse = { x: pEvent.clientX, y: pEvent.clientY };
  }
  private onMouseMove = (e: PointerEvent) => {
    if (!this.active) return;

    core.mode.wasMoving = true;

    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerMove(e);
    });
  };

  private onMouseUp = (e: PointerEvent) => {
    if (!this.active) return;

    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerUp(e);
    });
    Tools.stopEvent(e);

    this.active = false;
    window.removeEventListener("pointermove", this.onMouseMove);
    window.removeEventListener("pointerup", this.onMouseUp);
  };
}
