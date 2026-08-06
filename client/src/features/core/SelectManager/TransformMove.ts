import { core } from "@/features/core/core";
import type { SelectManager } from "./SelectManager";
import Tools from "../Tools";

export class TransformMove {
  private active = false;
  private selectManager: SelectManager;

  constructor(selectManager: SelectManager) {
    this.selectManager = selectManager;
  }

  start() {
    if (this.selectManager.selectedNodes.size === 0) return;
    this.active = true;

    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

    const pEvent = new PointerEvent("pointerdown", {
      clientX: core.desk.pointer.x,
      clientY: core.desk.pointer.y,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerDown(pEvent);
    });
    core.mode.selectMoving = true;
  }
  private onPointerMove = (e: PointerEvent) => {
    if (!this.active) return;

    core.mode.wasMoving = true;

    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerMove(e);
    });
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.active) return;

    this.selectManager.selectedNodes.forEach((node) => {
      node.onPointerUp(e);
    });
    Tools.stopEvent(e);

    this.active = false;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  };
}
