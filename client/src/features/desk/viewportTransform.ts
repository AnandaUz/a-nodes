import { core } from "../core/core";

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export function applyViewportTransform(
  el: HTMLElement,
  _scene: HTMLElement,
  state: ViewportState,
  _gridSize: number,
): void {
  const { x, y, scale } = state;
  core.mode.scale = scale;
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

export function screenToWorld(
  state: ViewportState,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const { x, y, scale } = state;
  return {
    x: (screenX - x) / scale,
    y: (screenY - y) / scale,
  };
}

export function calculateZoom(
  state: ViewportState,
  factor: number,
  originX: number,
  originY: number,
  minScale: number,
  maxScale: number,
): ViewportState {
  const newScale = Math.min(
    maxScale,
    Math.max(minScale, state.scale * factor),
  );

  const x = Math.round(
    originX - (originX - state.x) * (newScale / state.scale),
  );
  const y = Math.round(
    originY - (originY - state.y) * (newScale / state.scale),
  );

  return { x, y, scale: newScale };
}

export function calculatePinchZoom(
  state: ViewportState,
  dist: number,
  pinchStartDist: number,
  pinchStartScale: number,
  center: { x: number; y: number },
  sceneRect: DOMRect,
  minScale: number,
  maxScale: number,
): ViewportState {
  const newScale = Math.min(
    maxScale,
    Math.max(
      minScale,
      pinchStartScale * (dist / pinchStartDist),
    ),
  );
  const ox = center.x - sceneRect.left;
  const oy = center.y - sceneRect.top;

  const x = Math.round(
    ox - (ox - state.x) * (newScale / state.scale),
  );
  const y = Math.round(
    oy - (oy - state.y) * (newScale / state.scale),
  );

  return { x, y, scale: newScale };
}
