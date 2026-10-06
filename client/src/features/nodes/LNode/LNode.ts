import { core, EVENTS } from "@/features/core/core";
import type { INodeDB } from "@shared/types/INodeDB";
import type { VNode } from "@/features/nodes/VNode/VNode";
import VTextEdit from "../VNode/VTextEdit";
import TList from "./TList";

// для упаковки
const PARENT_LID_BITS = 17; // 0x1ffff
const INDEX_BITS = 12; // 0xfff
const TAB_BITS = 3;

const PARENT_LID_MASK = (1 << PARENT_LID_BITS) - 1; // 0x1ffff
const INDEX_MASK = (1 << INDEX_BITS) - 1; // 0xfff
const TAB_MASK = (1 << TAB_BITS) - 1; // 0xfff

export class LNode {
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

  exData?:
    | {
        ownerNodesIds?: string[] | undefined;
        bgColor?: string | undefined;
        tColor?: string | undefined;
        repeatMode?: string | undefined;
        repeatDay?: Date | undefined;
        url?: string | undefined;
        h?: string | undefined;
        hh?: number | undefined;
      }
    | undefined;

  lID?: number | undefined;
  vNode?: VNode;
  visible: boolean = true;

  constructor() {
    // this.list.onChange(() => {
    //   console.log("LNode list.onChange()");
    //   this.list.forEachChildren((child) => {
    //     const node = child as LNode_TextEdit;
    //     node.cloneNodes?.forEach((cl) => {
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
  getNodeRect(): DOMRect {
    let x0 = this.x,
      y0 = this.y,
      x1 = this.x + (this.vNode?.width ?? 0),
      y1 = this.y + (this.vNode?.height ?? 0);

    if (this.list.children?.size) {
      for (const child of this.list.children) {
        const childRect = child.getNodeRect();
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
  /**
   * Рекурсивно устанавливает позиции для всех дочерних узлов
   */

  save() {
    core.store.emit(EVENTS.node.updated, this);
  }
  toDB(): INodeDB {
    const res: INodeDB = {
      _id: this._id,
      userId: this.userId,
      pageId: this.pageId,
      inTrash: this.inTrash,
      lastUpdate: this.lastUpdate,
      type: this.type,
      title: this.title,
      // ok: this.ok,
    };
    // упаковываем данные в одну переменную listData
    if (this.list && this.list.parentLID !== undefined) {
      const parentLID = this.list.parentLID;
      const index = this.list.index ?? 0;
      const tab = this.list.tab ?? 0;

      res.L =
        ((parentLID & PARENT_LID_MASK) << (INDEX_BITS + TAB_BITS)) |
        ((index & INDEX_MASK) << TAB_BITS) | // index:
        (tab & TAB_MASK);
      res.x = undefined;
      res.y = undefined;
    } else {
      res.x = this.x;
      res.y = this.y;
      res.L = undefined;
    }
    // упаковка - s - разные переменные
    if (this.lID) {
      // упаковываем [lID] в одну переменную
      const lID = this.lID ?? 0;
      res.s = lID & 0x1ffff;
    } else {
      res.s = undefined;
    }
    if (this.exData) {
      res.exData = {
        ownerNodesIds: this.exData.ownerNodesIds ?? undefined,
        bgColor: this.exData.bgColor ?? undefined,
        tColor: this.exData.tColor ?? undefined,
        repeatMode: this.exData.repeatMode ?? undefined,
        repeatDay: this.exData.repeatDay ?? undefined,
        url: this.exData.url ?? undefined,
        h: this.exData.h ?? undefined,
        hh: this.exData.hh ?? undefined,
      };
    }
    return res;
  }
  fromDB(db: INodeDB) {
    this._id = db._id ?? "";
    this.userId = db.userId;
    this.pageId = db.pageId;
    this.inTrash = db.inTrash;
    this.lastUpdate = db.lastUpdate;
    this.type = db.type ?? 0;
    this.x = db.x ?? 0;
    this.y = db.y ?? 0;
    this.title = db.title;
    // this.ok = db.ok;
    // распаковываем listData
    if (db.L !== undefined && db.L !== null) {
      this.list.parentLID = (db.L >> (INDEX_BITS + TAB_BITS)) & PARENT_LID_MASK;
      this.list.index = (db.L >> TAB_BITS) & INDEX_MASK;
      this.list.tab = db.L & TAB_MASK;
    }
    if (db.exData) {
      this.exData = {
        ownerNodesIds: db.exData.ownerNodesIds,
        bgColor: db.exData.bgColor,
        tColor: db.exData.tColor,
        repeatMode: db.exData.repeatMode,
        repeatDay: db.exData.repeatDay,
        url: db.exData.url,
        h: db.exData.h,
        hh: db.exData.hh,
      };
    } else {
      this.exData = undefined;
    }
    // распаковываем разные переменные
    if (db.s) {
      this.lID = db.s & 0x1ffff;
    } else {
      this.lID = undefined;
    }
  }
}
