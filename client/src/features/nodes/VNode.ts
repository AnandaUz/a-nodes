// import type { INode } from "@shared/types";
import { core, EVENTS } from "../core/core";
import type { Command } from "../core/interfaces";
import Tools from "../core/Tools";
import type { LNode } from "@shared/types/LNode";

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
  lNode: LNode;
  private startPos: { x: number; y: number } = { x: 0, y: 0 };
  // public _id: string;
  // public x: number;
  // public y: number;
  width: number = 0;
  height: number = 0;
  public isSelected = false;
  // private isSelectAble = true;
  protected isMoved = false;
  protected movingElement!: HTMLElement;
  protected unsubscribers: Array<() => void> = [];
  private animationId: number | null = null;

  private lastClickTime: number = 0;
  private lastClickPos: { x: number; y: number } = { x: 0, y: 0 };

  // Константы для настройки чувствительности

  constructor(lNode: LNode, container: HTMLElement) {
    this.lNode = lNode;

    // this._id = lNode._id || "";
    // this.x = lNode.x ?? 0;
    // this.y = lNode.y ?? 0;

    this.container = container;

    this.body = document.createElement("div");
    this.body.className = "vNode";
    // this.body.dataset['_id'] = node._id;

    this.applyPosition();
    this.container.appendChild(this.body);
  }
  // get height() {
  //   return this.body.offsetHeight;
  // }
  // get width() {
  //   return this.body.offsetWidth;
  // }
  get bodyRect() {
    return {
      x: this.lNode.x,
      y: this.lNode.y,
      width: this.width,
      height: this.height,
    } as DOMRect;
  }
  refreshBodyRect() {
    this.width = this.body.offsetWidth;
    this.height = this.body.offsetHeight;
  }

  init() {
    this.bodyInit();
    this.initMovingElement();
    this.movingElement?.classList.add("moving-element");

    this.unsubscribers.push(
      core.store.on(EVENTS.lNode.updated, (lNode) => {
        if (lNode._id !== this.lNode._id) return;
        // this.lNode = lNode;
        // this.x = lNode.x ?? 0;
        // this.y = lNode.y ?? 0;
        this.applyPosition();
      }),
    );

    this.bind();
  }
  initMovingElement() {
    this.movingElement = this.body;
  }
  applyPosition() {
    let x = this.lNode.x || 0;
    let y = this.lNode.y || 0;
    // // let y = 0;
    // if (this.lNode.list?.parentLNode) {
    //   x = this.lNode.list.parentLNode?.x || 0;
    //   y = (this.lNode.list.parentLNode?.y || 0) + 21;
    // } else {
    //   x =
    // }
    this.body.style.transform = `translate(${x}px, ${y}px)`;
  }
  bodyInit() {
    this.body.innerHTML += `            
           <div class="el-tools"></div>               
`;
  }

  updatePosition() {
    this.applyPosition();
  }
  remove() {
    this.body.remove();
    this.unsubscribers.forEach((unsub) => unsub());
    this.unbind();
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
      if (this.isSelected) return;
      // если режим редактирования, то клик по ноде переходит в редактирование
      // core.selectManager.clearSelection();
      core.selectManager.selectNodeById(this.lNode._id || "", {
        ctrlKey: false,
      });
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
    // core.store.emit(EVENTS.lNode.pointer.down, this);

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    this.pointerOffset = {
      x: worldPos.x - (this.lNode.x || 0),
      y: worldPos.y - (this.lNode.y || 0),
    };

    this.startPos = { x: this.lNode.x, y: this.lNode.y };

    this.movingElement.setPointerCapture(e.pointerId);
  };
  onDoubleClick(_e: PointerEvent) {}

  onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    if (
      this.isSelected &&
      core.selectManager.selectedNodes.size > 1 &&
      !core.mode.selectMoving
    ) {
      core.selectManager.transformMove.start(); //если выбранно несколько

      return;
    }

    if (!this.isSelected) {
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

    this.lNode.x = x;
    this.lNode.y = Math.round(worldPos.y - this.pointerOffset.y);

    this.applyPosition();
    core.store.emit(EVENTS.lNode.moving, this.lNode);

    // если у него есть дети
    if (this.lNode.list?.children?.size) {
      this.lNode.setPositionForAllLinkedChildNodes();
    }
  };

  moveTo(position: { x: number | undefined; y: number | undefined }) {
    if (position.x !== undefined) this.lNode.x = Math.round(position.x);
    if (position.y !== undefined) this.lNode.y = Math.round(position.y);
    this.applyPosition();
    this.lNode.save();
    // core.nodeManager.moveToNode(this.lNode, this.x, this.y);
  }

  select() {
    this.isSelected = true;
    this.body.classList.add("is-selected");
  }

  unselect() {
    this.isSelected = false;
    this.body.classList.remove("is-selected");
    core.store.emit(EVENTS.lNode.unselected, this.lNode);
  }

  toggleSelect() {
    this.isSelected = !this.isSelected;
    this.body.classList.toggle("is-selected", this.isSelected);
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
    this.moveTo({ x: this.lNode.x, y: this.lNode.y });

    const moveCommand = (from: Position, to: Position): Command => ({
      execute: () => this.moveTo(to),
      undo: () => this.moveTo(from),
    });

    core.history.execute(
      moveCommand(this.startPos, { x: this.lNode.x, y: this.lNode.y }),
    );

    core.store.emit(EVENTS.lNode.moved, this.lNode);

    core.selectManager.onNodeMoveEnd(this);

    core.mode.selectMoving = false;

    this.onStop();
  };
  /** проверям точка над нодой */
  checkPointOver(x: number, y: number) {
    const rect = this.bodyRect; // Получаем координаты и размеры элемента
    // Проверяем, находится ли точка внутри границ элемента
    return (
      x >= this.lNode.x &&
      x <= this.lNode.x + rect.width &&
      y >= this.lNode.y &&
      y <= this.lNode.y + rect.height
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
    const idx = parseInt(this.lNode.exData?.repeatMode || "");
    const iconBlock = this.body.querySelector(".repeat-icon");
    if (!isNaN(idx) || this.lNode.exData?.repeatDay) {
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
    const tColor = this.lNode.exData?.tColor;
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
    const bgColor = this.lNode.exData?.bgColor;
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
    const h = this.lNode.exData?.h;
    if (h) {
      this.body.classList.add(h);
    }

    if (this.lNode.list) {
      const elTools = this.body.querySelector(".el-tools");
      if (elTools) {
        elTools.innerHTML =
          this.lNode.list.parentLNode?.title +
          ` i -  ${this.lNode.list.index} 
          t -  ${this.lNode.list.tab}`;
      }
    }
  }

  moveAniTo(x: number | null = null, y: number | null = null, delay = 0) {
    if (x === null && y === null) return;

    // отменяем предыдущую анимацию
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const targetX = x ?? this.lNode.x;
    const targetY = y ?? this.lNode.y;

    const startX = this.lNode.x;
    const startY = this.lNode.y;
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

        this.lNode.x = newX;

        this.lNode.y = newY;
        this.applyPosition();

        if (t < 1) {
          this.animationId = requestAnimationFrame(step);
        } else {
          this.moveTo({ x: targetX, y: targetY });
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
