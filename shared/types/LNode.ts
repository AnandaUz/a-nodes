import { core, EVENTS } from "@/features/core/core";
import type { INodeDB } from "./INodeDB";
import type { VNode } from "@/features/nodes/VNode";
import { GRID } from "@/features/core/CONST";
import Tools from "@/features/core/Tools";

// для упаковки
const PARENT_LID_BITS = 17; // 0x1ffff
const INDEX_BITS = 12; // 0xfff
const TAB_BITS = 3;

const PARENT_LID_MASK = (1 << PARENT_LID_BITS) - 1; // 0x1ffff
const INDEX_MASK = (1 << INDEX_BITS) - 1; // 0xfff
const TAB_MASK = (1 << TAB_BITS) - 1; // 0xfff

type TLNodeList = {
  parentLID?: number | undefined;
  parentLNode?: LNode | null;
  index?: number;
  tab?: number;
  children?: Set<LNode>;
};
const TRACKED_LIST_KEYS = new Set<string | symbol>([
  "index",
  "tab",
  "parentLNode",
]);
const proxiedLists = new WeakSet<object>();

export class LNode {
  _id: string | undefined = "";
  userId: string | undefined;
  pageId: string | undefined;
  inTrash: boolean | undefined;
  lastUpdate: Date | undefined;
  type: number = 0;
  title: string | undefined;

  private _list?: TLNodeList | undefined;

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
  get list(): TLNodeList | undefined {
    return this._list;
  }
  set list(value: TLNodeList | undefined) {
    this._list = value ? this.wrapList(value) : undefined;
  }
  private wrapList(target: TLNodeList): TLNodeList {
    // не оборачиваем повторно
    if (proxiedLists.has(target)) return target;

    const proxy = new Proxy(target, {
      set: (obj, prop, value, receiver) => {
        const oldValue = (obj as any)[prop];
        const ok = Reflect.set(obj, prop, value, receiver);
        if (ok && TRACKED_LIST_KEYS.has(prop) && oldValue !== value) {
          this.onChange(prop as "index" | "tab", oldValue, value);
        }
        return ok;
      },
      deleteProperty: (obj, prop) => {
        const oldValue = (obj as any)[prop];
        const ok = Reflect.deleteProperty(obj, prop);
        if (ok && TRACKED_LIST_KEYS.has(prop) && oldValue !== undefined) {
          this.onChange(prop as "index" | "tab", oldValue, undefined);
        }
        return ok;
      },
    });

    proxiedLists.add(proxy);
    return proxy;
  }
  onChange(
    field: "index" | "tab",
    oldValue: number | undefined,
    newValue: number | undefined,
  ) {
    this.vNode?.render();
  }
  constructor() {}
  /** проверяем дерево выстроенно верно или случились ошибки */
  checkListTree() {
    const descendants: LNode[] = [];
    const gather = (node: LNode) => {
      if (node.list?.children) {
        for (const child of node.list.children) {
          descendants.push(child);
          gather(child);
        }
      }
    };
    gather(this);

    // Сортируем по высоте (y)
    descendants.sort((a, b) => a.y - b.y);

    const list = [this, ...descendants];

    type TLevelParent = { lNode: LNode; count: number } | undefined | null;
    let levelsParents: TLevelParent[] = [];
    levelsParents[-1] = { lNode: this, count: 0 };

    list.forEach((chlNode, index) => {
      if (index === 0) return;
      if (!chlNode) return;

      const tabIndex =
        (Tools.getDiskPosition(chlNode.x) - Tools.getDiskPosition(this.x)) /
        GRID.x;

      levelsParents[tabIndex] = { lNode: chlNode, count: 0 };
      levelsParents.splice(tabIndex + 1);

      let t = 1;
      let mParent: TLevelParent = null;
      let tt = 10;
      while (1) {
        mParent = levelsParents[tabIndex - t];
        t++;
        if (mParent) break;
        if (tt-- < 0) break;
      }

      let isChanged = false;
      if (chlNode.list && chlNode.list?.parentLNode !== mParent?.lNode) {
        chlNode.list?.parentLNode?.list?.children?.delete(chlNode);
        const s = mParent?.lNode.list;
        if (s && !s.children) s.children = new Set();
        s?.children?.add(chlNode);
        chlNode.list.parentLNode = mParent?.lNode || null;
        chlNode.list.parentLID = mParent?.lNode?.lID || 0;

        console.log("тут!!!!");
        isChanged = true;
      }
      if (mParent && chlNode && chlNode.list?.index !== mParent.count) {
        chlNode.list!.index = mParent.count;
        const t =
          (Tools.getDiskPosition(chlNode.x) -
            Tools.getDiskPosition(mParent.lNode.x)) /
          GRID.x;
        chlNode.list!.tab = t;
        console.log("тут!!!!");
        isChanged = true;
      }
      if (mParent) mParent.count++;

      if (isChanged) chlNode.save();
    });
  }
  /**  удаляем из списком прошлого родителя */
  clearListParent(): LNode[] {
    const willRefParent: LNode[] = [];
    const parentLNode = this.list?.parentLNode;
    if (parentLNode) {
      parentLNode.list?.children?.delete(this);
      willRefParent.push(parentLNode);
    }
    const list = this.list;
    if (list) {
      list.parentLID = undefined;
      list.parentLNode = undefined;
    }

    return willRefParent;
  }
  setNewListParent(parent: LNode, newIndex: number): LNode[] {
    const willRefParent: LNode[] = [];
    let t = 0;
    // если родитель принадлежит списку

    if (parent.list?.parentLNode) {
      let plNode: LNode | null | undefined = parent;
      newIndex = (parent.list?.index ?? 0) + 0.1;

      t = Math.round((this.x - parent.x) / GRID.x);
      if (t <= 0) {
        let tt = 10;
        while (t <= 0) {
          if (!plNode?.list?.parentLNode) break;

          newIndex = (plNode.list?.index ?? 0) + 0.5;
          plNode = plNode?.list?.parentLNode;

          t = Math.round((this.x - plNode.x) / GRID.x);
          if (tt-- < 0) break;
        }

        if (!plNode) return willRefParent;

        parent = plNode;
      }
    }
    if (!parent.lID) {
      parent.lID = core.nodeManager.getMaxLID() + 1;

      parent.save();
    }

    const tab = Math.round((this.x - parent.x) / GRID.x);

    // удаляем из списком прошлого родителя
    if (this.list && this.list.parentLNode) {
      this.list.parentLNode.list?.children?.delete(this);
      willRefParent.push(this.list.parentLNode);
    }
    if (!this.list) {
      this.list = {};
    }
    this.list!.parentLID = parent.lID ?? 0;
    this.list!.parentLNode = parent;
    this.list!.index = newIndex - 0.5;
    this.list!.tab = tab;

    if (!parent.list) parent.list = {};
    if (!parent.list.children) parent.list.children = new Set();
    parent.list.children.add(this);
    const m = [...parent.list.children].sort(
      (a, b) => (a.list?.index ?? 0) - (b.list?.index ?? 0),
    );
    m.forEach((lNode, index) => {
      if (lNode.list) {
        if (lNode.list.index != index) {
          lNode.list.index = index;
          lNode.save();
        }
      }
    });

    willRefParent.push(this);
    return willRefParent;
  }
  getMainListParent(): LNode | null {
    let parent: LNode = this;
    while (parent.list?.parentLNode) {
      parent = parent.list.parentLNode;
    }
    return parent;
  }
  /**
   * Рекурсивно устанавливает позиции для всех дочерних узлов
   */
  setPositionForAllLinkedChildNodes() {
    if (this.list?.children?.size) {
      const m = [...this.list.children].sort(
        (a, b) => (a.list?.index ?? 0) - (b.list?.index ?? 0),
      );
      let h = 0;
      const startY = this.y + (this.vNode?.height ?? 0);
      for (const child of m) {
        child.x = this.x + GRID.x * (child.list?.tab ?? 0);
        child.y = startY + h;
        child.vNode?.applyPosition();
        h += child.vNode?.height ?? 0;
        h += child.setPositionForAllLinkedChildNodes();
      }
      return h;
    }
    return 0;
  }
  save() {
    core.store.emit(EVENTS.lNode.updated, this);
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
    if (db.L) {
      this.list = {
        parentLID: (db.L >> (INDEX_BITS + TAB_BITS)) & PARENT_LID_MASK,
        index: (db.L >> TAB_BITS) & INDEX_MASK,
        tab: db.L & TAB_MASK,
      };
    } else {
      this.list = undefined;
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
