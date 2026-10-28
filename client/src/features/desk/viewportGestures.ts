import Tools from "../core/Tools";
import { core } from "../core/core";

export interface ViewportGestureCallbacks {
  startPan: (clientX: number, clientY: number) => void;
  movePan: (clientX: number, clientY: number) => void;
  isPanning: () => boolean;
  setIsPanning: (v: boolean) => void;
  getCurrentScale: () => number;
  onPinchZoom: (
    dist: number,
    startDist: number,
    startScale: number,
    center: { x: number; y: number },
  ) => void;
  getOnDoubleTap?: () => ((clientX: number, clientY: number) => void) | undefined;
}

export class ViewportGestureController {
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private pinchStartDist = 0;
  private pinchStartScale = 1;
  private lastTapTime = 0;
  private lastTapPos = { x: 0, y: 0 };

  private callbacks: ViewportGestureCallbacks;

  constructor(callbacks: ViewportGestureCallbacks) {
    this.callbacks = callbacks;
  }

  onTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest(".btn-el")) {
      return;
    }

    Tools.stopEvent(e);

    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1) {
      if (
        core.mode.isPinching ||
        Date.now() - core.mode.lastPinchEndTime < 300
      ) {
        return;
      }
      const t = e.changedTouches[0]!;
      this.callbacks.startPan(t.clientX, t.clientY);

      // Двойной тап
      const now = Date.now();
      const dx = t.clientX - this.lastTapPos.x;
      const dy = t.clientY - this.lastTapPos.y;
      const dist = Math.hypot(dx, dy);

      if (now - this.lastTapTime < 300 && dist < 20) {
        this.callbacks.getOnDoubleTap?.()?.(t.clientX, t.clientY);
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
        this.lastTapPos = { x: t.clientX, y: t.clientY };
      }
    }

    if (this.activeTouches.size >= 2) {
      this.callbacks.setIsPanning(false);
      core.mode.isPinching = true;
      this.pinchStartDist = this.getPinchDist();
      this.pinchStartScale = this.callbacks.getCurrentScale();

      core.nodeManager?.nodes.forEach((node) => {
        node.vNode?.cancelDrag();
      });
    }
  };

  onTouchMove = (e: TouchEvent) => {
    Tools.stopEvent(e);

    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1 && this.callbacks.isPanning()) {
      if (
        core.mode.isPinching ||
        Date.now() - core.mode.lastPinchEndTime < 300
      ) {
        return;
      }
      const t = e.changedTouches[0]!;
      this.callbacks.movePan(t.clientX, t.clientY);
      return;
    }

    if (this.activeTouches.size >= 2) {
      core.mode.isPinching = true;
      const dist = this.getPinchDist();
      const center = this.getPinchCenter();
      this.callbacks.onPinchZoom(
        dist,
        this.pinchStartDist,
        this.pinchStartScale,
        center,
      );
    }
  };

  onTouchEnd = (e: TouchEvent) => {
    const wasPinching = core.mode.isPinching;

    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.delete(t.identifier);
    }

    if (this.activeTouches.size === 0) {
      this.callbacks.setIsPanning(false);
      if (wasPinching) {
        core.mode.isPinching = false;
        core.mode.lastPinchEndTime = Date.now();
      }
    } else if (this.activeTouches.size === 1) {
      if (wasPinching) {
        this.callbacks.setIsPanning(false);
        core.mode.isPinching = false;
        core.mode.lastPinchEndTime = Date.now();
      } else if (!this.callbacks.isPanning()) {
        const remaining = Array.from(this.activeTouches.values())[0]!;
        this.callbacks.startPan(remaining.x, remaining.y);
      }
    }
  };

  onTouchCancel = (e: TouchEvent) => {
    this.onTouchEnd(e);
  };

  private getPinchDist(): number {
    const [a, b] = Array.from(this.activeTouches.values());
    if (!a || !b) return 1;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private getPinchCenter(): { x: number; y: number } {
    const [a, b] = Array.from(this.activeTouches.values());
    if (!a || !b) return { x: 0, y: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}
