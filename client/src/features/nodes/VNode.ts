import type { INode } from "@shared/types";
import { core, EVENTS } from "../core/core";
import type { Command } from "../core/interfaces";

interface Position {
  x: number;
  y: number;
}
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
  public isSelected = false
  private isSelectAble = true
  private isMoved = false

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
    this.bind();
  }
  applyPosition() {
    this.body.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  bodyInit() { }

  updatePosition() {
    this.applyPosition();
  }
  remove() {
    this.body.remove();
  }
  bind() {
    this.body.addEventListener("pointerdown", this.onPointerDown);
    this.body.addEventListener("pointermove", this.onPointerMove);
    this.body.addEventListener("pointerup", this.onPointerUp);
  }

  unbind() {
    this.body.removeEventListener("pointerdown", this.onPointerDown);
    this.body.removeEventListener("pointermove", this.onPointerMove);
    this.body.removeEventListener("pointerup", this.onPointerUp);
  }
  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    this.isMoved = false;

    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    core.store.emit(EVENTS.nodes.mouse.down, e);

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);
    this.pointerOffset = {
      x: worldPos.x - (this.x || 0),
      y: worldPos.y - (this.y || 0),
    };

    this.startPos = { x: this.x, y: this.y };

    this.body.setPointerCapture(e.pointerId);

  };

  onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    if (this.isSelected && core.selectManager.selectedNodes.size > 1 && !core.mode.selectMoving) {
      core.selectManager.transformMove.start()
      // this.onPointerUp(e)

      return;
    }

    if (!this.isSelected) {
      this.select()
      core.selectManager.onVNodeClick(e, this)
    }

    this.isMoved = true;

    const worldPos = core.desk.viewport.screenToWorld(e.clientX, e.clientY);

    this.x = Math.round(worldPos.x - this.pointerOffset.x);
    this.y = Math.round(worldPos.y - this.pointerOffset.y);
    this.applyPosition();
  };

  private moveTo(position: Position) {
    this.nodeEss.x = Math.round(position.x);
    this.nodeEss.y = Math.round(position.y);
    this.x = this.nodeEss.x;
    this.y = this.nodeEss.y;
    this.applyPosition();
    core.store.emit(EVENTS.nodes.updated, this.nodeEss);
  }

  select() {
    this.isSelected = true;
    this.body.classList.add("is-selected");
  }

  unselect() {
    this.isSelected = false;
    this.body.classList.remove("is-selected");
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

      core.selectManager.onVNodeClick(e, this)


      return;
    }



    this.moveTo({ x: this.x, y: this.y });

    const moveCommand = (from: Position, to: Position): Command => ({
      execute: () => this.moveTo(to),
      undo: () => this.moveTo(from),
    })

    core.history.execute(moveCommand(this.startPos, { x: this.x, y: this.y }));
  };
  checkPointOver(x: number, y: number) {
    const rect = this.body.getBoundingClientRect(); // Получаем координаты и размеры элемента

    // Проверяем, находится ли точка внутри границ элемента
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }
  checkInRect(selectedArea: DOMRect) {
    let f_x = false
    let f_y = false

    const x = selectedArea.x
    const y = selectedArea.y
    const w = selectedArea.width
    const h = selectedArea.height

    const rect = this.body.getBoundingClientRect()

    const b_x = rect.x// + dx
    const b_w = rect.width

    const b_y = rect.y// + dy
    const b_h = rect.height

    if (x < b_x && x + w > b_x) {
      f_x = true
    }
    else {
      if (x > b_x && x < b_x + b_w) {
        f_x = true
      }
    }
    if (y < b_y && y + h > b_y) {
      f_y = true
    }
    else {
      if (y > b_y && y < b_y + b_h) {
        f_y = true
      }
    }
    return f_x && f_y
  }
  render() { }

}
