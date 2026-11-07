import { core, EVENTS } from "@/features/core/core";
import type { VNode } from "@/features/nodes/VNode/VNode";
import TList from "./TList";
import type { ILNode } from "@shared/types/ILNode";
import type { IExData } from "@shared/types/IExData";
import type { IOutFrameData } from "@shared/types/INodeDB";

import TRepeatMode from "./TRepeatMode";
import TClones from "./TClones";

export class LNode implements ILNode {
  _id: string | undefined = "";
  userId: string | undefined;
  pageId: string | undefined;
  inTrash: boolean | undefined;
  lastUpdate: Date | undefined;
  type: number = 0;
  repeatMode = new TRepeatMode(this);
  clones = new TClones(this);
  private _title: string | undefined;
  get title(): string | undefined {
    return this._title;
  }
  set title(v: string | undefined) {
    this._title = v;
  }
  isSelected = false;
  list = new TList(this);

  private _x: number = 0;
  private _y: number = 0;
  get x(): number {
    return this._x;
  }
  set x(v: number) {
    if (this._x === v) return;
    this._x = v;
    this.list?.invalidateRectCache();
  }
  get y(): number {
    return this._y;
  }
  set y(v: number) {
    if (this._y === v) return;
    this._y = v;
    this.list?.invalidateRectCache();
  }

  exData?: IExData | undefined;

  lID?: number | undefined;
  vNode?: VNode | undefined;
  /** поле которое я сохраняю в базе */
  hiddenBD: boolean = false;
  /** поле которое показывает видна нода или нет */
  private _hidden: boolean = false;
  get hidden(): boolean {
    return this._hidden;
  }
  set hidden(v: boolean) {
    if (this._hidden === v) return;
    this._hidden = v;
    this.list?.invalidateRectCache();
  }
  isLockedInOutFrame?: boolean;
  outFrameLID?: number | undefined;
  outOrigParentLID?: number | undefined;
  isOutGroupHeader?: boolean;
  selectedOutLID?: number | undefined;
  outLimit?: number | undefined;
  out?: IOutFrameData[] | null | undefined;

  constructor() {}
  forCompatibility() {
    // конвертация старой версии repeatMode
    if (this.exData) {
      if (this.exData.repeatMode || this.exData.repeatDay) {
        if (this.exData.repeatDay) {
          this.repeatMode.date = new Date(this.exData.repeatDay);
          this.exData.repeatDay = undefined;
          if (this.inTrash) this.inTrash = false;
          this.save();
        }
        if (this.exData.repeatMode) {
          this.repeatMode.mode = Number(this.exData.repeatMode);
          this.exData.repeatMode = undefined;
          if (this.inTrash) this.inTrash = false;
          this.save();
        }
      }
    }
  }
  /** всё что необходимо чтобы обновить ноду */
  refresh() {}
  init() {}
  /** удаляет ноду */
  remove() {
    if (this.list.children?.size) {
      const children = Array.from(this.list.children);
      if (!this.list.isListOpen) {
        this.list.isListOpen = true;
        this.list.children.forEach((c) => {
          if (!c.hiddenBD) c.hidden = false;
        });
        this.list.setPositionForChildren();
      }
      children.forEach((child) => {
        child.list.clearParent();
        child.vNode?.applyPosition();
        child.vNode?.renderSVG();
      });
    }

    this.vNode?.remove();
    if (this.list.parentNode) {
      const parentNode = this.list.parentNode;
      parentNode.list.children?.delete(this);
      parentNode.list.invalidateChildrenOrder();
      parentNode.list.invalidateRectCache();
      (parentNode.vNode as any)?.refreshListBtns?.();
      const mainParent = this.list.mainParent;
      if (mainParent) {
        mainParent.list.setPositionForChildren();
        mainParent.vNode?.renderSVG();
      }
    }
  }
  hide(withChildren: boolean = true, isSelf: boolean = true) {
    this.hidden = true;
    if (isSelf) {
      this.hiddenBD = true;
      this.save();
    }
    this.vNode?.hide();
    core.selectManager?.unselectNode(this);

    if (withChildren && this.list.children?.size) {
      this.list.children.forEach((child) => {
        child.hide(true, false);
      });
    }

    if (this.list.parentNode) {
      const mainParent = this.list.mainParent;
      if (mainParent) {
        mainParent.list.setPositionForChildren();
        mainParent.vNode?.renderSVG();
      }
      (this.list.parentNode.vNode as any)?.refreshListBtns?.();
    } else {
      this.vNode?.renderSVG();
    }
  }
  show(withChildren: boolean = true, isSelf: boolean = true) {
    this.hidden = false;
    if (isSelf) {
      this.hiddenBD = false;
      this.save();
    }
    if (!this.vNode && core.nodeRenderer) {
      core.nodeRenderer.createVNode(this);
    } else {
      this.vNode?.show();
    }

    if (withChildren && this.list.children?.size) {
      this.list.children.forEach((child) => {
        if (!child.hiddenBD) {
          child.show(true, false);
        }
      });
    }

    if (this.list.parentNode) {
      const mainParent = this.list.mainParent;
      if (mainParent) {
        mainParent.list.setPositionForChildren();
        mainParent.vNode?.renderSVG();
      }
      (this.list.parentNode.vNode as any)?.refreshListBtns?.();
    } else {
      this.vNode?.renderSVG();
    }
    (this.vNode as any)?.refreshListBtns?.();
  }
  /** возращает тип для VNode */
  getVNodeType(): typeof VNode | undefined {
    return undefined;
  }

  /** возращает прямоугольник в который входит и родитель и все его дети */
  getNodeRect(withChildren = true): DOMRect {
    if (withChildren && this.list._cachedRect) {
      return this.list._cachedRect;
    }
    let x0 = this.x,
      y0 = this.y,
      x1 = this.x + (this.vNode?.width ?? 0),
      y1 = this.y + (this.vNode?.height ?? 0);

    if (withChildren && this.list.children?.size) {
      for (const child of this.list.children) {
        if (child.hidden) continue;
        const childRect = child.getNodeRect(true);
        x0 = Math.min(x0, childRect.x);
        y0 = Math.min(y0, childRect.y);
        x1 = child.isOutGroupHeader ? x1 : Math.max(x1, childRect.x + childRect.width);
        y1 = Math.max(y1, childRect.y + childRect.height);
      }
    }
    const rect = {
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
    } as DOMRect;
    if (withChildren) {
      this.list._cachedRect = rect;
    }
    return rect;
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
    core.store?.emit(EVENTS.node.updated, this);
  }
}
