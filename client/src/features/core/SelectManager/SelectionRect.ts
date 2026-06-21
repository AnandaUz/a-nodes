import { core } from "../core";

export default class SelectionRect {
  private el: HTMLDivElement;
  private p1 = { x: 0, y: 0 };
  private onComplete: (rect: DOMRect, event: MouseEvent) => void;
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    onComplete: (rect: DOMRect, event: MouseEvent) => void,
  ) {
    this.container = container;
    this.onComplete = onComplete;
    this.el = document.createElement("div");
    this.el.classList.add("selectBox");
    container.appendChild(this.el);
    container.addEventListener("pointerdown", this.onMouseDown);
  }

  private onMouseDown = (e: PointerEvent) => {
    if (e.buttons !== 1) return;
    if (core.mode.textEditing) return;

    this.p1 = { x: e.clientX, y: e.clientY };
    this.el.style.display = "block";
    this.update(e.clientX, e.clientY);

    window.addEventListener("pointermove", this.onMouseMove);
    window.addEventListener("pointerup", this.onMouseUp);
  };

  private onMouseMove = (e: PointerEvent) => {
    this.update(e.clientX, e.clientY);
  };

  private onMouseUp = (e: PointerEvent) => {
    const rect = this.getRect(e.clientX, e.clientY);

    this.el.style.display = "none";

    window.removeEventListener("pointermove", this.onMouseMove);
    window.removeEventListener("pointerup", this.onMouseUp);

    this.onComplete(rect, e);
  };

  private update(x2: number, y2: number) {
    const rect = this.getRect(x2, y2);
    const s = this.el.style;
    s.left = rect.x + "px";
    s.top = rect.y + "px";
    s.width = rect.width + "px";
    s.height = rect.height + "px";
  }

  private getRect(x2: number, y2: number) {
    return {
      x: Math.min(this.p1.x, x2),
      y: Math.min(this.p1.y, y2),
      width: Math.abs(this.p1.x - x2),
      height: Math.abs(this.p1.y - y2),
    } as DOMRect;
  }

  destroy() {
    this.el.remove();
    this.container.removeEventListener("pointerdown", this.onMouseDown);
  }
}
