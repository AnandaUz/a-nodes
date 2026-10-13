import { core, EVENTS } from "@/features/core/core";
import type { VNode } from "@/features/nodes/VNode/VNode";
import VTextEdit from "../VNode/VTextEdit";
import TList from "./TList";
import type { ILNode } from "@shared/types/ILNode";
import type { IExData } from "@shared/types/IExData";

export class LNode implements ILNode {
  _id: string | undefined = "";
  userId: string | undefined;
  pageId: string | undefined;
  inTrash: boolean | undefined;
  lastUpdate: Date | undefined;
  type: number = 0;
  private _title: string | undefined;
  get title(): string | undefined {
    return this._title;
  }
  set title(v: string | undefined) {
    this._title = v;
  }
  isSelected = false;
  list = new TList(this);

  x: number = 0;
  y: number = 0;

  exData?: IExData | undefined;

  lID?: number | undefined;
  vNode?: VNode;
  hidden: boolean = false;

  constructor() {
    // this.list.onChange(() => {
    //   console.log("LNode list.onChange()");
    //   this.list.forEachChildren((child) => {
    //     const node = child as LNode_TextEdit;
    //     node.clones.nodes.forEach((cl) => {
    //       cl.refresh();
    //     });
    //   });
    // });
  }
  /** всё что необходимо чтобы обновить ноду */
  refresh() {}
  init() {}
  /** удаляет ноду */
  remove() {
    this.vNode?.remove();
    if (this.list.parentNode) {
      const mainParent = this.list.getMainParent();
      if (mainParent) {
        mainParent.list.setPositionForChildren();
        mainParent.vNode?.renderSVG();
      }
    }
  }

  /** возращает тип для VNode */
  getVNodeType(): typeof VNode {
    return VTextEdit;
  }

  /** возращает прямоугольник в который входит и родитель и все его дети */
  getNodeRect(withChildren = true): DOMRect {
    let x0 = this.x,
      y0 = this.y,
      x1 = this.x + (this.vNode?.width ?? 0),
      y1 = this.y + (this.vNode?.height ?? 0);

    if (withChildren && this.list.children?.size) {
      for (const child of this.list.children) {
        const childRect = child.getNodeRect(false);
        x0 = Math.min(x0, childRect.x);
        y0 = Math.min(y0, childRect.y);
        x1 = Math.max(x1, childRect.x + childRect.width);
        y1 = Math.max(y1, childRect.y + childRect.height);
      }
    }
    return {
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
    } as DOMRect;
  }
  /** выделить ноду */
  select() {
    this.isSelected = true;
    this.vNode?.select();
  }
  /** снять выделение с ноды */
  unselect() {
    this.isSelected = false;
    this.vNode?.unselect();
  }
  onPointerMove() {}
  moveTo(
    position: { x: number | undefined; y: number | undefined },
    save = true,
  ) {
    if (position.x !== undefined) this.x = Math.round(position.x);
    if (position.y !== undefined) this.y = Math.round(position.y);
    this.vNode?.applyPosition();
    if (save) this.save();
  }

  save() {
    core.store.emit(EVENTS.node.updated, this);
  }
}
