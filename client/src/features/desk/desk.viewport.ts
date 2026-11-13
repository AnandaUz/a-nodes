import { core } from "../core/core";
import Tools from "../core/Tools";
import { viewportStore } from "../../services/storage";
import {
  applyViewportTransform,
  calculatePinchZoom,
  calculateZoom,
  screenToWorld,
  type ViewportState,
} from "./viewportTransform";
import { ViewportGestureController } from "./viewportGestures";

export type { ViewportState };

const SCALE_STEP = 0.15;

export class Viewport {
  private el: HTMLElement;
  scene: HTMLElement; // нужен для фона и событий
  state: ViewportState = { x: 0, y: 0, scale: 1 };

  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };
  private gestureController: ViewportGestureController;
  private urlSyncTimer: ReturnType<typeof setTimeout> | null = null;

  onDoubleTap?: (clientX: number, clientY: number) => void;

  readonly minScale = 0.1;
  readonly maxScale = 4;
  readonly gridSize = 24; // совпадает с background-size в scss

  constructor(el: HTMLElement, scene: HTMLElement) {
    this.el = el;
    this.scene = scene;

    this.gestureController = new ViewportGestureController({
      startPan: (clientX, clientY) => this.startPan(clientX, clientY),
      movePan: (clientX, clientY) => this.movePan(clientX, clientY),
      isPanning: () => this.isPanning,
      setIsPanning: (v) => {
        if (!v) {
          this.stopPan();
        } else {
          this.isPanning = true;
          this.el.classList.add("is-panning");
        }
      },
      getCurrentScale: () => this.state.scale,
      onPinchZoom: (dist, startDist, startScale, center) => {
        const rect = this.scene.getBoundingClientRect();
        this.state = calculatePinchZoom(
          this.state,
          dist,
          startDist,
          startScale,
          center,
          rect,
          this.minScale,
          this.maxScale,
        );
        this.applyTransform();
        core.viewportCuller?.scheduleUpdate();
        viewportStore.saveViewport(core.mode.deskId, this.state);
        this.scheduleUrlSync(300);
      },
      getOnDoubleTap: () => this.onDoubleTap,
    });

    this.bindEvents();

    const fromUrl = this.readViewportFromUrl();
    if (fromUrl) {
      this.state = fromUrl;
      viewportStore.saveViewport(core.mode.deskId, this.state);
    } else {
      const st = viewportStore.getViewport(core.mode.deskId);
      if (st) {
        this.state = st;
      }
    }
    this.applyTransform();
    this.scheduleUrlSync(0);
  }

  // ─── Transform ───────────────────────────────────────────────

  private applyTransform() {
    applyViewportTransform(this.el, this.scene, this.state, this.gridSize);
  }

  private readViewportFromUrl(): ViewportState | null {
    if (typeof window === "undefined") return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const xStr = params.get("x");
      const yStr = params.get("y");
      const zStr = params.get("z") ?? params.get("zoom") ?? params.get("scale");

      if (xStr !== null && yStr !== null) {
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          let scale = 1;
          if (zStr !== null) {
            const parsedScale = parseFloat(zStr);
            if (!Number.isNaN(parsedScale)) {
              scale = Math.min(this.maxScale, Math.max(this.minScale, parsedScale));
            }
          }
          return { x, y, scale };
        }
      }
    } catch {}
    return null;
  }

  private scheduleUrlSync(delay = 300) {
    if (typeof window === "undefined") return;
    if (this.urlSyncTimer !== null) {
      clearTimeout(this.urlSyncTimer);
    }
    this.urlSyncTimer = setTimeout(() => {
      this.urlSyncTimer = null;
      this.syncUrl();
    }, delay);
  }

  private syncUrl() {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("x", Math.round(this.state.x).toString());
      url.searchParams.set("y", Math.round(this.state.y).toString());
      url.searchParams.set("z", Number(this.state.scale.toFixed(2)).toString());

      window.history.replaceState(window.history.state, "", url);
    } catch {}
  }

  private onPopState = () => {
    const fromUrl = this.readViewportFromUrl();
    if (fromUrl) {
      this.state = fromUrl;
      this.applyTransform();
      viewportStore.saveViewport(core.mode.deskId, this.state);
      core.viewportCuller?.scheduleUpdate();
    }
  };

  getState(): Readonly<ViewportState> {
    return { ...this.state };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return screenToWorld(this.state, screenX, screenY);
  }

  // ─── Pan helpers ──────────────────────────────────────────────

  private rafPanId: number | null = null;
  private pendingPan: { clientX: number; clientY: number } | null = null;

  private startPan(clientX: number, clientY: number) {
    if (this.rafPanId !== null) {
      cancelAnimationFrame(this.rafPanId);
      this.rafPanId = null;
    }
    this.isPanning = true;
    this.el.classList.add("is-panning");
    this.panStart = { x: clientX, y: clientY };
    this.panOrigin = { x: this.state.x, y: this.state.y };
    this.pendingPan = null;
  }

  private stopPan() {
    this.flushPan();
    this.isPanning = false;
    this.el.classList.remove("is-panning");
    core.viewportCuller?.update();
    viewportStore.saveViewport(core.mode.deskId, this.state);
    this.scheduleUrlSync(0);
  }

  private movePan(clientX: number, clientY: number) {
    this.pendingPan = { clientX, clientY };
    if (this.rafPanId === null) {
      this.rafPanId = requestAnimationFrame(this.renderPanFrame);
    }
  }

  private renderPanFrame = () => {
    this.rafPanId = null;
    if (!this.pendingPan || !this.isPanning) return;
    this.state.x = Math.round(
      this.panOrigin.x + (this.pendingPan.clientX - this.panStart.x),
    );
    this.state.y = Math.round(
      this.panOrigin.y + (this.pendingPan.clientY - this.panStart.y),
    );
    this.applyTransform();
    core.viewportCuller?.scheduleUpdate();
    this.scheduleUrlSync(300);
  };

  private flushPan() {
    if (this.rafPanId !== null) {
      cancelAnimationFrame(this.rafPanId);
      this.rafPanId = null;
    }
    if (this.pendingPan && this.isPanning) {
      this.state.x = Math.round(
        this.panOrigin.x + (this.pendingPan.clientX - this.panStart.x),
      );
      this.state.y = Math.round(
        this.panOrigin.y + (this.pendingPan.clientY - this.panStart.y),
      );
      this.applyTransform();
      this.pendingPan = null;
    }
  }

  // ─── Pan (мышь / стилус) ──────────────────────────────────────

  private isSpaceDown = false;

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") return; // touch обрабатывается отдельно

    if (e.button !== 1 && !this.isSpaceDown) return;

    const target = e.target as HTMLElement;
    if (this.isSpaceDown && target.closest("a")) {
      return;
    }

    Tools.stopEvent(e);
    this.startPan(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.scene.style.cursor = "grabbing";
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!this.isPanning) return;
    this.movePan(e.clientX, e.clientY);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!this.isPanning) return;
    this.stopPan();
    this.scene.style.cursor = this.isSpaceDown ? "grab" : "";
  };

  private onWheel = (e: WheelEvent) => {
    Tools.stopEvent(e);

    const factor = e.deltaY < 0 ? 1 + SCALE_STEP : 1 - SCALE_STEP;
    const rect = this.scene.getBoundingClientRect();
    this.applyZoom(factor, e.clientX - rect.left, e.clientY - rect.top);

    viewportStore.saveViewport(core.mode.deskId, this.state);
    this.scheduleUrlSync(300);
  };

  private applyZoom(factor: number, originX: number, originY: number) {
    this.state = calculateZoom(
      this.state,
      factor,
      originX,
      originY,
      this.minScale,
      this.maxScale,
    );
    this.applyTransform();
    core.viewportCuller?.scheduleUpdate();
  }

  // ─── Space + drag ─────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.repeat) return;
    const target = document.activeElement;
    if (target instanceof HTMLElement) {
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
    }
    Tools.stopEvent(e);
    this.isSpaceDown = true;
    this.scene.style.cursor = "grab";
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    this.isSpaceDown = false;
    if (!this.isPanning) this.scene.style.cursor = "";
  };

  // ─── Bind / Destroy ───────────────────────────────────────────

  private bindEvents() {
    this.scene.addEventListener("pointerdown", this.onPointerDown);
    this.scene.addEventListener("pointermove", this.onPointerMove);
    this.scene.addEventListener("pointerup", this.onPointerUp);
    this.scene.addEventListener("wheel", this.onWheel, { passive: false });

    this.scene.addEventListener("touchstart", this.gestureController.onTouchStart, {
      passive: false,
    });
    this.scene.addEventListener("touchmove", this.gestureController.onTouchMove, {
      passive: false,
    });
    this.scene.addEventListener("touchend", this.gestureController.onTouchEnd);
    this.scene.addEventListener("touchcancel", this.gestureController.onTouchCancel);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("popstate", this.onPopState);
  }

  destroy() {
    this.el.classList.remove("is-panning");
    if (this.urlSyncTimer !== null) {
      clearTimeout(this.urlSyncTimer);
      this.urlSyncTimer = null;
    }
    if (this.rafPanId !== null) {
      cancelAnimationFrame(this.rafPanId);
      this.rafPanId = null;
    }
    this.scene.removeEventListener("pointerdown", this.onPointerDown);
    this.scene.removeEventListener("pointermove", this.onPointerMove);
    this.scene.removeEventListener("pointerup", this.onPointerUp);
    this.scene.removeEventListener("wheel", this.onWheel);

    this.scene.removeEventListener("touchstart", this.gestureController.onTouchStart);
    this.scene.removeEventListener("touchmove", this.gestureController.onTouchMove);
    this.scene.removeEventListener("touchend", this.gestureController.onTouchEnd);
    this.scene.removeEventListener("touchcancel", this.gestureController.onTouchCancel);

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("popstate", this.onPopState);
  }
}
