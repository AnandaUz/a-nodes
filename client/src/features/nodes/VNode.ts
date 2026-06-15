import type { INode } from "@shared/types";
import { core, EVENTS } from "../core/core";
import type { Command } from "../core/interfaces";
import Tools from "../core/Tools";

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
  nodeEss: INode;
  private startPos: { x: number; y: number } = { x: 0, y: 0 };
  public _id: string;
  public x: number;
  public y: number;
  public isSelected = false;
  // private isSelectAble = true;
  protected isMoved = false;
  protected movingElement!: HTMLElement;
  protected unsubscribers: Array<() => void> = [];
  private animationId: number | null = null;

  private lastClickTime: number = 0;
  private lastClickPos: { x: number; y: number } = { x: 0, y: 0 };

  // Константы для настройки чувствительности

  constructor(nodeEss: INode, container: HTMLElement) {
    this.nodeEss = nodeEss;

    this._id = nodeEss._id || "";
    this.x = nodeEss.x ?? 0;
    this.y = nodeEss.y ?? 0;

    this.container = container;

    this.body = document.createElement("div");
    this.body.className = "vNode";
    // this.body.dataset['_id'] = node._id;

    this.applyPosition();
    this.container.appendChild(this.body);
  }

  init() {
    this.bodyInit();
    this.initMovingElement();
    this.movingElement?.classList.add("moving-element");

    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.updated, (nodeEss) => {
        if (nodeEss._id !== this._id) return;
        this.nodeEss = nodeEss;
        this.x = nodeEss.x ?? 0;
        this.y = nodeEss.y ?? 0;
        this.applyPosition();
      }),
    );

    this.bind();
  }
  initMovingElement() {
    this.movingElement = this.body;
  }
  applyPosition() {
    this.body.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  bodyInit() {}
  save() {
    core.store.emit(EVENTS.nodes.updated, this.nodeEss);
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
    if (core.mode.textEditing) return;
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
    core.store.emit(EVENTS.nodes.mouse.down, this);

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);
    this.pointerOffset = {
      x: worldPos.x - (this.x || 0),
      y: worldPos.y - (this.y || 0),
    };

    this.startPos = { x: this.x, y: this.y };

    this.movingElement.setPointerCapture(e.pointerId);
  };
  onDoubleClick(_e: PointerEvent) {
    // Tools.stopEvent(e);
    // // Сбрасываем флаги перетаскивания на всякий случай
    // this.isDragging = false;
    // this.movingElement.releasePointerCapture(e.pointerId);
  }

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
      core.selectManager.onVNodeClick(e, this);
      // this.select();
    }

    this.isMoved = true;

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    this.x = Math.round(worldPos.x - this.pointerOffset.x);
    this.y = Math.round(worldPos.y - this.pointerOffset.y);

    this.applyPosition();
    core.store.emit(EVENTS.nodes.moving, this);
  };

  moveTo(position: { x: number | undefined; y: number | undefined }) {
    if (position.x !== undefined) this.x = Math.round(position.x);
    if (position.y !== undefined) this.y = Math.round(position.y);
    this.applyPosition();
    core.nodeManager.moveToNode(this.nodeEss, this.x, this.y);
  }

  select() {
    this.isSelected = true;
    this.body.classList.add("is-selected");
  }

  unselect() {
    this.isSelected = false;
    this.body.classList.remove("is-selected");
    core.store.emit(EVENTS.nodes.unselected, this);
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
    this.moveTo({ x: this.x, y: this.y });

    const moveCommand = (from: Position, to: Position): Command => ({
      execute: () => this.moveTo(to),
      undo: () => this.moveTo(from),
    });

    core.history.execute(moveCommand(this.startPos, { x: this.x, y: this.y }));

    core.store.emit(EVENTS.nodes.moved, this);

    core.mode.selectMoving = false;

    this.onStop();
  };
  checkPointOver(x: number, y: number) {
    const rect = this.body.getBoundingClientRect(); // Получаем координаты и размеры элемента

    // Проверяем, находится ли точка внутри границ элемента
    return (
      x >= this.x &&
      x <= this.x + rect.width &&
      y >= this.y &&
      y <= this.y + rect.height
    );
  }
  checkInRect(selectedArea: DOMRect) {
    let f_x = false;
    let f_y = false;

    const x = selectedArea.x;
    const y = selectedArea.y;
    const w = selectedArea.width;
    const h = selectedArea.height;

    const rect = this.movingElement.getBoundingClientRect();

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
    const idx = parseInt(this.nodeEss.exData?.repeatMode || "");
    const iconBlock = this.body.querySelector(".repeat-icon");
    if (!isNaN(idx) || this.nodeEss.exData?.repeatDay) {
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
  }

  moveAniTo(x: number | null = null, y: number | null = null, delay = 0) {
    if (x === null && y === null) return;

    // отменяем предыдущую анимацию
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const targetX = x ?? this.x;
    const targetY = y ?? this.y;

    const startX = this.x;
    const startY = this.y;
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

        this.x = newX;
        this.y = newY;
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
