import type { VNode } from "./VNode";

export class ResizeController {
  private vNode: VNode;
  width: number = 0;
  height: number = 0;

  constructor(vNode: VNode) {
    this.vNode = vNode;
  }

  get bodyRect(): DOMRect {
    return {
      x: this.vNode.node.x,
      y: this.vNode.node.y,
      width: this.width,
      height: this.height,
    } as DOMRect;
  }

  refreshBodyRect(): void {
    this.vNode.body.style.width = ""; // естественная ширина по тексту (заголовок фрейма растягивается в renderBgSVG)
    this.width = this.vNode.body.offsetWidth || this.width || 0;
    this.height = this.vNode.body.offsetHeight || this.height || 0;
  }

  /** проверяем точка над нодой */
  checkPointOver(x: number, y: number): boolean {
    const rect = this.bodyRect; // Получаем координаты и размеры элемента
    // Проверяем, находится ли точка внутри границ элемента
    return (
      x >= this.vNode.node.x &&
      x <= this.vNode.node.x + rect.width &&
      y >= this.vNode.node.y &&
      y <= this.vNode.node.y + rect.height
    );
  }

  checkInRect(selectedArea: DOMRect): boolean {
    let f_x = false;
    let f_y = false;

    const x = selectedArea.x;
    const y = selectedArea.y;
    const w = selectedArea.width;
    const h = selectedArea.height;

    const rect = this.bodyRect;

    const b_x = rect.x; // + dx
    const b_w = rect.width;

    const b_y = rect.y; // + dy
    const b_h = rect.height;

    if (x < b_x && x + w > b_x) {
      f_x = true;
    } else {
      if (x > b_x && x < b_x + b_w) {
        f_x = true;
      }
    }
    if (y < b_y && y + h > b_y) {
      f_y = true;
    } else {
      if (y > b_y && y < b_y + b_h) {
        f_y = true;
      }
    }
    return f_x && f_y;
  }

  animateFrameBg(
    elFrameBg: HTMLElement | null | undefined,
    fromRect: DOMRect,
    toRect: DOMRect,
    duration = 200,
  ): void {
    if (!elFrameBg || typeof elFrameBg.animate !== "function") return;
    elFrameBg.animate(
      [
        {
          transform: `translate(${fromRect.x}px, ${fromRect.y}px)`,
          width: `${fromRect.width}px`,
          height: `${fromRect.height}px`,
        },
        {
          transform: `translate(${toRect.x}px, ${toRect.y}px)`,
          width: `${toRect.width}px`,
          height: `${toRect.height}px`,
        },
      ],
      { duration, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }
}
