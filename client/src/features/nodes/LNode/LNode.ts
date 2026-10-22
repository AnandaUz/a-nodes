import { core, EVENTS } from "@/features/core/core";
import type { VNode } from "@/features/nodes/VNode/VNode";
import VTextEdit from "../VNode/VTextEdit";
import TList from "./TList";
import type { ILNode } from "@shared/types/ILNode";
import type { IExData } from "@shared/types/IExData";

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

  x: number = 0;
  y: number = 0;

  exData?: IExData | undefined;

  lID?: number | undefined;
  vNode?: VNode | undefined;
  /** поле которое я сохраняю в базе */
  hiddenBD: boolean = false;
  /** поле которое показывает видна нода или нет */
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
      // конвертация старой версии clones
      if (this.exData.ownerNodesIds) {
        const sourceNodeId = this.exData.ownerNodesIds[0];
        if (sourceNodeId) {
          const mainNode = [...core.nodeManager.nodes.values()].find(
            (n) => n._id === sourceNodeId,
          );
          if (mainNode) {
            if (!mainNode.lID) {
              mainNode.lID = core.nodeManager.getMaxLID() + 1;
              mainNode.save();
            }
            this.clones.mainNode = mainNode;
            this.exData.ownerNodesIds = undefined;
            this.save();
          }
        }
      }
    }
  }
  /** всё что необходимо чтобы обновить ноду */
  refresh() {}
  init() {}
  /** удаляет ноду */
  remove() {
    this.vNode?.remove();
    if (this.list.parentNode) {
      const parentNode = this.list.parentNode;
      parentNode.list.children?.delete(this);
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
        if (child.hidden) continue;
        const childRect = child.getNodeRect(true);
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
