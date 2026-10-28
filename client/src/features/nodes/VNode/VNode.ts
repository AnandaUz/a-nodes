import { core, EVENTS } from "../../core/core";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { DndController } from "./DndController";
import { ResizeController } from "./ResizeController";

export { DndController } from "./DndController";
export { ResizeController } from "./ResizeController";

export class VNode {
  private container: HTMLElement;
  body: HTMLElement;
  node!: LNode;
  hidden: boolean = false;

  movingElement!: HTMLElement;
  protected unsubscribers: Array<() => void> = [];
  private animationId: number | null = null;

  protected elSVG?: SVGRectElement | null = null;
  elFrameBg?: HTMLElement | null = null;

  readonly dndController: DndController;
  readonly resizeController: ResizeController;

  constructor(node: LNode, container: HTMLElement) {
    this.node = node;
    this.container = container;
    this.dndController = new DndController(this);
    this.resizeController = new ResizeController(this);
    this.body = document.createElement("div");
    this.body.className = "vNode";
    this.applyPosition();
    this.container.appendChild(this.body);
  }

  get width(): number {
    return this.resizeController.width;
  }
  set width(val: number) {
    this.resizeController.width = val;
  }

  get height(): number {
    return this.resizeController.height;
  }
  set height(val: number) {
    this.resizeController.height = val;
  }

  get bodyRect(): DOMRect {
    return this.resizeController.bodyRect;
  }

  refreshBodyRect(): void {
    this.resizeController.refreshBodyRect();
  }

  checkPointOver(x: number, y: number): boolean {
    return this.resizeController.checkPointOver(x, y);
  }

  checkInRect(selectedArea: DOMRect): boolean {
    return this.resizeController.checkInRect(selectedArea);
  }

  get isDragging(): boolean {
    return this.dndController.isDragging;
  }
  set isDragging(val: boolean) {
    this.dndController.isDragging = val;
  }

  get isMoved(): boolean {
    return this.dndController.isMoved;
  }
  set isMoved(val: boolean) {
    this.dndController.isMoved = val;
  }
  init() {
    this.bodyInit();
    this.initMovingElement();
    this.movingElement?.classList.add("moving-element");

    this.unsubscribers.push(
      core.store.on(EVENTS.node.updated, (node) => {
        if (node._id !== this.node._id) return;
        this.applyPosition();
      }),
    );
    this.bind();
  }
  refreshIndicators() {
    let elIndBlock = this.body.querySelector(".el-indicators") as HTMLElement;
    const needRepeat =
      (this.node.repeatMode.mode > 0 || !!this.node.repeatMode.date) &&
      !this.hidden;
    const needHidden = Boolean(this.node.hiddenBD) && !this.hidden;

    if (!needRepeat && !needHidden) {
      if (elIndBlock) elIndBlock.remove();
      return;
    }

    if (!elIndBlock) {
      elIndBlock = document.createElement("div");
      elIndBlock.className = "el-indicators";
      this.body.appendChild(elIndBlock);
    }

    let elRepeat = elIndBlock.querySelector(".ind-repeat");
    if (needRepeat) {
      if (!elRepeat) {
        elRepeat = document.createElement("div");
        elRepeat.className = "ind-repeat";
        elIndBlock.appendChild(elRepeat);
      }
    } else {
      elRepeat?.remove();
    }

    let elHidden = elIndBlock.querySelector(".ind-hidden");
    if (needHidden) {
      if (!elHidden) {
        elHidden = document.createElement("div");
        elHidden.className = "ind-hidden";
        elIndBlock.appendChild(elHidden);
      } else {
        elIndBlock.appendChild(elHidden);
      }
    } else {
      elHidden?.remove();
    }
  }
  repeatMode = {
    showIndicator: () => {
      this.refreshIndicators();
    },
    hideIndicator: () => {
      this.refreshIndicators();
    },
  };
  hide() {
    this.hidden = true;
    this.body.style.display = "none";
    if (this.elSVG) {
      core.desk.svgLayer.removeRect(this.elSVG);
      this.elSVG = null;
    }
  }
  show() {
    this.hidden = false;
    this.body.style.display = "";
    this.render();
  }
  initMovingElement() {
    this.movingElement = this.body;
  }
  applyPosition() {
    let x = this.node.x || 0;
    let y = this.node.y || 0;
    this.body.style.transform = `translate(${x}px, ${y}px)`;
    this.renderSVG();
  }
  bodyInit() {
    // this.body.innerHTML += `
    //            <div class="el-debugging"></div>
    // `;
  }

  updatePosition() {
    this.applyPosition();
  }
  remove() {
    this.body.remove();
    this.unsubscribers.forEach((unsub) => unsub());
    this.unbind();
    if (this.elSVG) core.desk.svgLayer.removeRect(this.elSVG);
    if (this.elFrameBg) {
      this.elFrameBg.remove();
      this.elFrameBg = null;
    }
  }
  bind() {
    this.dndController.bind(this.movingElement);
  }

  unbind() {
    this.dndController.unbind();
  }

  cancelDrag() {
    this.dndController.cancelDrag();
  }

  onPointerDown = (e: PointerEvent) => {
    this.dndController.onPointerDown(e);
  };

  onDoubleClick(_e: PointerEvent) {}

  flushDragMove() {
    this.dndController.flushDragMove();
  }

  onPointerMove = (e: PointerEvent, fromTransform = false) => {
    this.dndController.onPointerMove(e, fromTransform);
  };

  select() {
    this.node.isSelected = true;
    this.body.classList.add("is-selected");
  }

  unselect() {
    this.node.isSelected = false;
    this.body.classList.remove("is-selected");
    core.store.emit(EVENTS.node.unselected, this.node);
  }

  toggleSelect() {
    this.node.isSelected = !this.node.isSelected;
    this.body.classList.toggle("is-selected", this.node.isSelected);
  }

  onPointerUp = (e: PointerEvent) => {
    this.dndController.onPointerUp(e);
  };
  render() {
    if (this.hidden) return;
    const idx = parseInt(this.node.exData?.repeatMode || "");
    const iconBlock = this.body.querySelector(".repeat-icon");
    if (!isNaN(idx) || this.node.exData?.repeatDay) {
      this.body.classList.add("repeat-day");
      if (!iconBlock) {
        const el = document.createElement("div");
        el.classList.add("repeat-icon");
        this.body.appendChild(el);
      }
    } else {
      this.body.classList.remove("repeat-day");
      if (iconBlock) {
        iconBlock.remove();
      }
    }
    const tColor = this.node.exData?.tColor;
    if (tColor) {
      let c = tColor;
      if (/^\d{1,3}$/g.test(tColor)) {
        c = tColor;
      } else {
      }
      this.body.style.setProperty("--color", c);
    } else {
      this.body.style.removeProperty("--color");
    }
    const bgColor = this.node.exData?.bgColor;
    if (bgColor) {
      let c = bgColor;
      if (/^\d{1,3}$/g.test(bgColor)) {
        c = bgColor;
      } else {
      }
      this.body.style.setProperty("--bg-color", c);
    } else {
      this.body.style.removeProperty("--bg-color");
    }
    this.body.classList.remove("h1", "h2", "h3", "h4");
    const h = this.node.exData?.h;
    if (h) {
      this.body.classList.add(h);
    }
    this.refreshIndicators();
    this.refreshBodyRect();

    // для атладки
    /*if (this.node.list) {
      const elTools = this.body.querySelector(".el-tools");
      if (elTools) {
        elTools.innerHTML =
          this.node.list.parentNode?.title +
          ` i -  ${this.node.list.index}
          t -  ${this.node.list.tab}`;
      }
    }  */
  }

  animateMove(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration = 200,
  ) {
    if (typeof this.body?.animate !== "function") return;
    this.body.animate(
      [
        { transform: `translate(${fromX}px, ${fromY}px)` },
        { transform: `translate(${toX}px, ${toY}px)` },
      ],
      { duration, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }

  animateFrameBg(
    fromRect: DOMRect,
    toRect: DOMRect,
    duration = 200,
  ) {
    this.resizeController.animateFrameBg(
      this.elFrameBg,
      fromRect,
      toRect,
      duration,
    );
  }

  renderSVG(animate = false, oldFrameRect: DOMRect | null = null) {
    this.renderBgSVG(animate, oldFrameRect);
    // фон мог измениться — перерисовываем связи фрейма
    (
      this.node as unknown as { frame?: { redrawPaths(): void } }
    ).frame?.redrawPaths();
    if (animate) {
      setTimeout(() => {
        (
          this.node as unknown as { frame?: { redrawPaths(): void } }
        ).frame?.redrawPaths();
      }, 210);
    }
  }
  private renderBgSVG(animate = false, oldFrameRect: DOMRect | null = null) {
    // только у топовых родителей
    if (this.node.list.parentNode || this.hidden || this.node.hidden) {
      if (this.elSVG) {
        core.desk.svgLayer.removeRect(this.elSVG);
        this.elSVG = null;
      }
      if (this.elFrameBg) {
        this.elFrameBg.remove();
        this.elFrameBg = null;
      }
      return;
    }
    const isFrame = !!(this.node as unknown as { frame?: { isFrame: boolean } })
      .frame?.isFrame;
    const children = this.node.list.children;
    const hasVisibleChildren = children && [...children].some((c) => !c.hidden);

    if (isFrame) {
      if (this.elSVG) {
        core.desk.svgLayer.removeRect(this.elSVG);
        this.elSVG = null;
      }
      if (hasVisibleChildren) {
        const lRect = this.node.getNodeRect();
        this.body.style.width = `${Math.max(lRect.width, this.width)}px`;
        if (!this.elFrameBg) {
          this.elFrameBg = document.createElement("div");
          this.elFrameBg.className = "frame-bg";
          this.elFrameBg.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            (
              this.node as unknown as { frame?: { bringToFront(): void } }
            ).frame?.bringToFront();
          });
          this.container.appendChild(this.elFrameBg);
        }
        if (
          animate &&
          oldFrameRect &&
          (oldFrameRect.x !== lRect.x ||
            oldFrameRect.y !== lRect.y ||
            oldFrameRect.width !== lRect.width ||
            oldFrameRect.height !== lRect.height)
        ) {
          this.animateFrameBg(oldFrameRect, lRect);
        }
        this.elFrameBg.style.transform = `translate(${lRect.x}px, ${lRect.y}px)`;
        this.elFrameBg.style.width = `${lRect.width}px`;
        this.elFrameBg.style.height = `${lRect.height}px`;
      } else {
        this.body.style.width = "";
        if (this.elFrameBg) {
          this.elFrameBg.remove();
          this.elFrameBg = null;
        }
      }
      return;
    }

    // обычная группа (не фрейм)
    if (this.elFrameBg) {
      this.elFrameBg.remove();
      this.elFrameBg = null;
    }
    if (hasVisibleChildren) {
      const lRect = this.node.getNodeRect();
      this.body.style.width = "";
      if (!this.elSVG) {
        this.elSVG = core.desk.svgLayer.drawRect(
          lRect.x,
          lRect.y,
          lRect.width,
          lRect.height,
          "#dce4e946",
        );
      } else {
        core.desk.svgLayer.moveRect(
          this.elSVG,
          lRect.x,
          lRect.y,
          lRect.width,
          lRect.height,
        );
      }
    } else {
      this.body.style.width = "";
      if (this.elSVG) {
        core.desk.svgLayer.removeRect(this.elSVG);
        this.elSVG = null;
      }
    }
  }
  highlight() {
    this.body.classList.add("highlight");
  }
  unhighlight() {
    this.body.classList.remove("highlight");
  }

  moveAniTo(x: number | null = null, y: number | null = null, delay = 0) {
    if (x === null && y === null) return;

    // отменяем предыдущую анимацию
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const targetX = x ?? this.node.x;
    const targetY = y ?? this.node.y;

    const startX = this.node.x;
    const startY = this.node.y;
    const duration = 200;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

    const start = () => {
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = easeOut(t);

        const newX = startX + (targetX - startX) * ease;
        const newY = startY + (targetY - startY) * ease;

        this.node.x = newX;

        this.node.y = newY;
        this.applyPosition();

        if (t < 1) {
          this.animationId = requestAnimationFrame(step);
        } else {
          this.node.moveTo({ x: targetX, y: targetY });
          this.animationId = null;
        }
      };

      this.animationId = requestAnimationFrame(step);
    };

    if (delay > 0) {
      setTimeout(start, delay);
    } else {
      start();
    }
  }
  onStop() {}
}
