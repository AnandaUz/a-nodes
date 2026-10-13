import Tools from "@/features/core/Tools";
import { LNode } from "./LNode";
import { GRID } from "@/features/core/CONST";
import { core } from "@/features/core/core";

// /** класс для полей на изменение которых вызывает обновление */
// class Observable<T> {
//   private _val: T;
//   private _listeners = new Set<(v: T) => void>();

//   constructor(initial: T) {
//     this._val = initial;
//   }

//   get value() {
//     return this._val;
//   }
//   set value(v: T) {
//     if (this._val === v) return;
//     this._val = v;
//     this._listeners.forEach((fn) => fn(v));
//   }

//   onChange(fn: (v: T) => void): () => void {
//     this._listeners.add(fn);
//     return () => this._listeners.delete(fn);
//   }
// }

export default class TList {
  private owner: LNode;
  parentLID?: number | undefined;
  _parentNode?: LNode | null;
  index?: number;
  _tab?: number;
  children?: Set<LNode>;
  private _onChangeListeners: Set<() => void> = new Set();
  private _totalIndexCallBacks: Set<(v: number) => void> = new Set();
  private _totalIndex: number = 0;

  constructor(owner: LNode) {
    this.owner = owner;
  }
  get totalIndex() {
    return this._totalIndex;
  }
  set totalIndex(v: number) {
    if (this._totalIndex === v) return;
    this._totalIndex = v;
    this._totalIndexCallBacks.forEach((fn) => fn(v));
  }
  onTotalIndexChanged(fn: (v: number) => void): () => void {
    this._totalIndexCallBacks.add(fn);
    return () => this._totalIndexCallBacks.delete(fn);
  }

  get parentNode() {
    return this._parentNode || null;
  }
  set parentNode(node: LNode | null) {
    if (node === this._parentNode) return;
    this._parentNode = node;
    this.parentLID = node?.lID;
    this._onChangeListeners.forEach((fn) => fn());
  }
  get tab() {
    return this._tab ?? 0;
  }
  set tab(tab: number) {
    if (this._tab === tab) return;
    this._tab = tab;
    this._onChangeListeners.forEach((fn) => fn());
  }
  onChange(fn: () => void): () => void {
    this._onChangeListeners.add(fn);
    return () => this._onChangeListeners.delete(fn); // отписка
  }
  forEachChildren(fn: (node: LNode, index: number) => void) {
    if (this.children?.size) {
      const m = [...this.children].sort(
        (a, b) => (a.list.index ?? 0) - (b.list.index ?? 0),
      );
      for (const [index, child] of m.entries()) {
        fn(child, index);
        child.list.forEachChildren(fn);
      }
    }
  }
  initParent() {
    if (this.parentLID && this.parentLID !== this.owner.lID) {
      const parentNode = core.nodeManager.getNodeByLID(this.parentLID);
      if (parentNode) {
        if (!parentNode.list.children) {
          parentNode.list.children = new Set<LNode>();
        }
        parentNode.list.children.add(this.owner);

        this.owner.list.parentNode = parentNode;
      }
    }
  }
  /** проверяем дерево выстроенно верно или случились ошибки */
  checkTree() {
    const owner = this.owner;
    const descendants: LNode[] = [];
    const gather = (node: LNode) => {
      if (node.list.children) {
        for (const child of node.list.children) {
          descendants.push(child);
          gather(child);
        }
      }
    };
    gather(owner);
    // Сортируем по высоте (y)
    descendants.sort((a, b) => a.y - b.y);

    const list = [owner, ...descendants];

    type TLevelParent = { node: LNode; count: number } | undefined | null;
    let levelsParents: TLevelParent[] = [];
    levelsParents[-1] = { node: owner, count: 0 };

    list.forEach((chNode, index) => {
      if (index === 0) return;
      if (!chNode) return;

      const tabIndex =
        (Tools.getDiskPosition(chNode.x) - Tools.getDiskPosition(owner.x)) /
        GRID.x;

      levelsParents[tabIndex] = { node: chNode, count: 0 };
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
      if (chNode.list && chNode.list.parentNode !== mParent?.node) {
        chNode.list.parentNode?.list.children?.delete(chNode);
        const s = mParent?.node.list;
        if (s && !s.children) s.children = new Set();
        s?.children?.add(chNode);
        chNode.list.parentNode = mParent?.node || null;
        chNode.list.parentLID = mParent?.node?.lID || 0;

        console.log("тут!!!!");
        isChanged = true;
      }
      if (mParent && chNode && chNode.list.index !== mParent.count) {
        chNode.list!.index = mParent.count;
        const t =
          (Tools.getDiskPosition(chNode.x) -
            Tools.getDiskPosition(mParent.node.x)) /
          GRID.x;
        chNode.list!.tab = t;
        console.log("тут!!!!");
        isChanged = true;
      }
      if (mParent) mParent.count++;

      if (isChanged) chNode.save();
    });
  }
  /**  удаляем из списком прошлого родителя */
  clearParent(): LNode[] {
    const willRefParent: LNode[] = [];
    const parentNode = this.parentNode;
    if (parentNode) {
      parentNode.list.children?.delete(this.owner);
      willRefParent.push(parentNode);
    }
    this.parentLID = undefined;
    this.parentNode = null;

    return willRefParent;
  }
  setParent(parent: LNode, newIndex: number): LNode[] {
    const owner = this.owner;
    const willRefParent: LNode[] = [];
    let t = 0;
    // если родитель принадлежит списку

    if (parent.list.parentNode) {
      let pnode: LNode | null | undefined = parent;
      newIndex = (parent.list.index ?? 0) + 0.1;

      t = Math.round((owner.x - parent.x) / GRID.x);
      if (t <= 0) {
        let tt = 10;
        while (t <= 0) {
          if (!pnode?.list.parentNode) break;

          newIndex = (pnode.list.index ?? 0) + 0.5;
          pnode = pnode?.list.parentNode;

          t = Math.round((owner.x - pnode.x) / GRID.x);
          if (tt-- < 0) break;
        }

        if (!pnode) return willRefParent;

        parent = pnode;
      }
    }
    if (!parent.lID) {
      parent.lID = core.nodeManager.getMaxLID() + 1;
      parent.save();
    }

    const tab = Math.round((owner.x - parent.x) / GRID.x);

    // удаляем из списком прошлого родителя
    if (this.parentNode) {
      this.parentNode.list.children?.delete(owner);
      willRefParent.push(this.parentNode);
    }
    // this.parentLID = parent.lID ?? 0;

    this.index = newIndex - 0.5;
    this.tab = tab;
    const oldParentNode = this.parentNode;
    this.parentNode = parent;
    // если изменился родитель
    if (oldParentNode != parent) {
      owner.refresh();
    }

    if (!parent.list.children) parent.list.children = new Set();
    parent.list.children.add(owner);
    const m = [...parent.list.children].sort(
      (a, b) => (a.list.index ?? 0) - (b.list.index ?? 0),
    );
    m.forEach((node, index) => {
      if (node.list) {
        if (node.list.index != index) {
          node.list.index = index;
          node.save();
        }
      }
    });

    willRefParent.push(owner);
    return willRefParent;
  }
  get mainParent(): LNode | null {
    let parent: LNode = this.owner;
    while (parent.list.parentNode) {
      parent = parent.list.parentNode;
    }
    return parent;
  }
  setPositionForChildren(
    parentX: number | undefined = undefined,
    totalTab = 0,
    totalIndex = 0,
  ) {
    if (this.children?.size) {
      const owner = this.owner;
      const m = [...this.children].sort(
        (a, b) => (a.list.index ?? 0) - (b.list.index ?? 0),
      );
      let h = 0;
      const startY = owner.y + (owner.vNode?.height ?? 0);
      for (const child of m) {
        child.x = owner.x + GRID.x * (child.list.tab ?? 0);
        child.y = startY + h;
        if (totalTab == 0) totalIndex++;
        child.list.totalIndex = totalIndex;
        child.vNode?.applyPosition();
        const xx = Math.round((child.x - (parentX || owner.x)) / GRID.x);

        const chVNode = child.vNode;
        if (chVNode) {
          chVNode.body.dataset.totaltab = xx.toString();
          chVNode.refreshBodyRect();
        }

        h += chVNode?.height ?? 0;
        h += child.list.setPositionForChildren(
          parentX || owner.x,
          totalTab + xx,
          totalIndex,
        );
      }
      owner.vNode?.renderSVG();
      return h;
    }
    return 0;
  }
}
