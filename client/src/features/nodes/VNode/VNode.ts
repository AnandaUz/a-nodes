import { core, EVENTS } from "../../core/core";
import type { Command } from "../../core/interfaces";
import Tools from "../../core/Tools";
import type { LNode } from "@/features/nodes/LNode/LNode";

interface Position {
  x: number;
  y: number;
}
const DBL_CLICK_DELAY = 300; // Максимальное время между кликами (мс)
const DBL_CLICK_DISTANCE = 5;
export class VNode {
  private container: HTMLElement;
  body: HTMLElement;
  private isDragging: boolean = false;
  private pointerOffset = { x: 0, y: 0 };
  node!: LNode;
  private startPos: { x: number; y: number } = { x: 0, y: 0 };
  // public _id: string;
  // public x: number;
  // public y: number;
  width: number = 0;
  height: number = 0;
  hidden: boolean = false;

  // private isSelectAble = true;
  protected isMoved = false;
  protected movingElement!: HTMLElement;
  protected unsubscribers: Array<() => void> = [];
  private animationId: number | null = null;

  private lastClickTime: number = 0;
  private lastClickPos: { x: number; y: number } = { x: 0, y: 0 };
  protected elSVG?: SVGRectElement | null = null;

  // Константы для настройки чувствительности

  constructor(node: LNode, container: HTMLElement) {
    this.node = node;
    this.container = container;
    this.body = document.createElement("div");
    this.body.className = "vNode";
    this.applyPosition();
    this.container.appendChild(this.body);
  }
  get bodyRect() {
    return {
      x: this.node.x,
      y: this.node.y,
      width: this.width,
      height: this.height,
    } as DOMRect;
  }
  refreshBodyRect() {
    this.body.style.width = ""; // естественная ширина по тексту (заголовок фрейма растягивается в renderBgSVG)
    this.width = this.body.offsetWidth;
    this.height = this.body.offsetHeight;
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
  repeatMode = {
    // <div class="el-indicators">
    //           <div class="ind-hidden"></div>
    //           <div class="ind-repeats"></div>
    //         </div>
    showIndicator: () => {
      if (this.hidden) return;
      let elIndBlock = this.body.querySelector(".el-indicators");
      if (!elIndBlock) {
        elIndBlock = document.createElement("div");
        elIndBlock.className = "el-indicators";
        this.body.appendChild(elIndBlock);
      }
      let elRepeat = elIndBlock.querySelector(".ind-repeat");

      if (!elRepeat) {
        elRepeat = document.createElement("div");
        elRepeat.className = "ind-repeat";
        elIndBlock.appendChild(elRepeat);
      }

      // if (this.node.hidden) {
      //   elRepeat.classList.add("active");
      // } else {
      //   elRepeat.classList.remove("active");
      // }
    },
    hideIndicator: () => {
      const elRepeat = this.body.querySelector(".ind-repeat");
      if (elRepeat) {
        elRepeat.remove();
      }
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
  }
  bind() {
    this.movingElement.addEventListener("pointerdown", this.onPointerDown);
    this.movingElement.addEventListener("pointermove", this.onPointerMove);
    this.movingElement.addEventListener("pointerup", this.onPointerUp);
  }

  unbind() {
    this.movingElement.removeEventListener("pointerdown", this.onPointerDown);
    this.movingElement.removeEventListener("pointermove", this.onPointerMove);
    this.movingElement.removeEventListener("pointerup", this.onPointerUp);
  }
  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (core.mode.textEditing) {
      if (this.node.isSelected) return;
      // если режим редактирования, то клик по ноде переходит в редактирование
      // core.selectManager.clearSelection();
      core.selectManager.selectNode(this.node, { ctrlKey: false });
      // this.select();
      this.onDoubleClick(e);
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
      this.onDoubleClick(e); // Вызываем наш кастомный метод двойного клика
      return; // Прерываем выполнение, чтобы не начинать тащить ноду при двойном клике
    }

    // Сохраняем текущее время и координаты для следующей проверки
    this.lastClickTime = currentTime;
    this.lastClickPos = { x: e.clientX, y: e.clientY };
    // ---------------------------------

    this.isMoved = false;

    Tools.stopEvent(e);

    this.isDragging = true;
    // core.store.emit(EVENTS.node.pointer.down, this);

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    this.pointerOffset = {
      x: worldPos.x - (this.node.x || 0),
      y: worldPos.y - (this.node.y || 0),
    };

    this.startPos = { x: this.node.x, y: this.node.y };

    this.movingElement.setPointerCapture(e.pointerId);
  };
  onDoubleClick(_e: PointerEvent) {}

  onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    if (
      this.node.isSelected &&
      core.selectManager.selectedNodes.size > 1 &&
      !core.mode.selectMoving
    ) {
      core.selectManager.transformMove.start(); //если выбранно несколько

      return;
    }

    if (!this.node.isSelected) {
      if (!core.mode.inputMode.coarse) {
        core.selectManager.onVNodeClick(e, this);
      }

      // this.select();
    }

    this.isMoved = true;

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    let x = Math.round(worldPos.x - this.pointerOffset.x);
    if (1) {
      x = Tools.getDiskPosition(x);
    }

    this.node.x = x;
    this.node.y = Math.round(worldPos.y - this.pointerOffset.y);

    this.node.onPointerMove();
    this.applyPosition();
    core.store.emit(EVENTS.node.moving, this.node);

    // если у него есть дети
    if (this.node.list.children?.size) {
      this.node.list.setPositionForChildren();
    }
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
    if (!this.isDragging) return;
    this.body.classList.remove("is-dragging");
    this.isDragging = false;
    if (!this.isMoved) {
      this.toggleSelect();
      core.selectManager.onVNodeClick(e, this);
      return;
    }
    this.node.moveTo({ x: this.node.x, y: this.node.y });

    const moveCommand = (from: Position, to: Position): Command => ({
      execute: () => this.node.moveTo(to),
      undo: () => this.node.moveTo(from),
    });

    core.history.execute(
      moveCommand(this.startPos, { x: this.node.x, y: this.node.y }),
    );

    core.store.emit(EVENTS.node.moved, this.node);

    core.selectManager.onNodeMoveEnd(this);

    core.mode.selectMoving = false;

    this.onStop();
  };
  /** проверям точка над нодой */
  checkPointOver(x: number, y: number) {
    const rect = this.bodyRect; // Получаем координаты и размеры элемента
    // Проверяем, находится ли точка внутри границ элемента
    return (
      x >= this.node.x &&
      x <= this.node.x + rect.width &&
      y >= this.node.y &&
      y <= this.node.y + rect.height
    );
  }
  checkInRect(selectedArea: DOMRect) {
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
    if (this.node.repeatMode.mode > 0 || this.node.repeatMode.date) {
      this.repeatMode.showIndicator();
    } else {
      this.repeatMode.hideIndicator();
    }
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
  renderSVG() {
    this.renderBgSVG();
    // фон мог измениться — перерисовываем связи фрейма
    (
      this.node as unknown as { frame?: { redrawPaths(): void } }
    ).frame?.redrawPaths();
  }
  private renderBgSVG() {
    // только у топовых родителей
    if (this.node.list.parentNode || this.hidden || this.node.hidden) {
      if (this.elSVG) {
        core.desk.svgLayer.removeRect(this.elSVG);
        this.elSVG = null;
      }
      return;
    }
    const isFrame = !!(this.node as unknown as { frame?: { isFrame: boolean } })
      .frame?.isFrame;
    // сменился тип фона (фрейм <-> группа) — пересоздаём
    if (this.elSVG && (this.elSVG.dataset.frame === "1") !== isFrame) {
      core.desk.svgLayer.removeRect(this.elSVG);
      this.elSVG = null;
    }
    // если есть дети, то рисуется фон в виде прямоугольника
    const children = this.node.list.children;
    const hasVisibleChildren = children && [...children].some((c) => !c.hidden);
    if (hasVisibleChildren) {
      const lRect = this.node.getNodeRect();
      // заголовок фрейма: минимум — по тексту, максимум — на всю ширину блока
      this.body.style.width = isFrame ? `${Math.max(lRect.width, this.width)}px` : "";
      if (!this.elSVG) {
        const svg = core.desk.svgLayer;
        this.elSVG = isFrame
          ? svg.drawFrameRect(lRect.x, lRect.y, lRect.width, lRect.height)
          : svg.drawRect(
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
