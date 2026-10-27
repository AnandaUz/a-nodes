import Tools from "@/features/core/Tools";
import { LNode } from "./LNode";
import { GRID } from "@/features/core/CONST";


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
  index?: number | undefined;
  _tab?: number;
  children?: Set<LNode>;
  isListOpen: boolean = true;
  isRepeatsOpen: boolean = false;
  isHiddenOpen: boolean = false;

  get hasChildren(): boolean {
    return (this.children?.size ?? 0) > 0;
  }

  hasRepeatChildren(): boolean {
    if (!this.children?.size) return false;
    for (const child of this.children) {
      if (child.repeatMode.mode > 0 || !!child.repeatMode.date) {
        return true;
      }
    }
    return false;
  }

  hasHiddenChildren(): boolean {
    if (!this.children?.size) return false;
    for (const child of this.children) {
      const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
      if (child.hiddenBD && !isRepeat) {
        return true;
      }
    }
    return false;
  }

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
    this.parentLID = node ? node.lID : undefined;
    if (node === this._parentNode) return;
    this._parentNode = node;
    this._onChangeListeners.forEach((fn) => fn());
  }
  get tab() {
    return Math.max(0, this._tab ?? 0);
  }
  set tab(tab: number) {
    const val = Math.max(0, tab);
    if (this._tab === val) return;
    this._tab = val;
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
  initParent(parentNode?: LNode) {
    if (parentNode) {
      if (!parentNode.list.children) {
        parentNode.list.children = new Set<LNode>();
      }
      parentNode.list.children.add(this.owner);
      this._parentNode = parentNode;
      this.parentLID = parentNode.lID;
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
    const excluded = new Set<LNode>();

    type TLevelParent = { node: LNode; count: number } | undefined | null;
    let levelsParents: TLevelParent[] = [];
    levelsParents[-1] = { node: owner, count: 0 };

    list.forEach((chNode, index) => {
      if (index === 0) return;
      if (!chNode) return;

      const tabIndex = Math.round(
        (Tools.getDiskPosition(chNode.x) - Tools.getDiskPosition(owner.x)) /
          GRID.x,
      );

      const parentIsExcluded =
        chNode.list.parentNode && excluded.has(chNode.list.parentNode);

      if (tabIndex < 0 || parentIsExcluded) {
        excluded.add(chNode);
        chNode.list.clearParent();
        chNode.save();
        return;
      }

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
        const oldParent = chNode.list.parentNode;
        chNode.list.parentNode?.list.children?.delete(chNode);
        (oldParent?.vNode as any)?.refreshListBtns?.();
        const s = mParent?.node.list;
        if (s && !s.children) s.children = new Set();
        s?.children?.add(chNode);
        (mParent?.node.vNode as any)?.refreshListBtns?.();
        chNode.list.parentNode = mParent?.node || null;
        isChanged = true;
      }
      if (mParent?.node && chNode.list.parentLID !== mParent.node.lID) {
        chNode.list.parentLID = mParent.node.lID;
        isChanged = true;
      }
      if (mParent && chNode) {
        const t = Math.max(
          0,
          Math.round(
            (Tools.getDiskPosition(chNode.x) -
              Tools.getDiskPosition(mParent.node.x)) /
              GRID.x,
          ),
        );
        if (chNode.list.tab !== t) {
          chNode.list.tab = t;
          isChanged = true;
        }
        if (chNode.list.index !== mParent.count) {
          chNode.list.index = mParent.count;
          isChanged = true;
        }
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
      (parentNode.vNode as any)?.refreshListBtns?.();
      willRefParent.push(parentNode);

      const isRepeat =
        (this.owner.repeatMode?.mode ?? 0) > 0 ||
        !!this.owner.repeatMode?.date;
      if ((this.owner.hiddenBD || this.owner.hidden) && !isRepeat) {
        this.owner.hiddenBD = false;
        this.owner.hidden = false;
        this.owner.vNode?.show();
        this.owner.vNode?.refreshIndicators?.();
        if (this.children?.size) {
          this.forEachChildren((child) => {
            const childIsRepeat =
              (child.repeatMode?.mode ?? 0) > 0 || !!child.repeatMode?.date;
            if (!child.hiddenBD && !childIsRepeat) {
              child.hidden = false;
              child.vNode?.show();
              child.vNode?.refreshIndicators?.();
            }
          });
          this.setPositionForChildren();
        }
      }
    }
    this.parentLID = undefined;
    this.parentNode = null;
    this.index = undefined;
    this.tab = 0;
    if (this.owner.vNode?.body) {
      delete this.owner.vNode.body.dataset.totaltab;
      this.owner.vNode.refreshBodyRect();
    }
    this.owner.save();

    return willRefParent;
  }
  setParent(parent: LNode, newIndex: number): LNode[] {
    const owner = this.owner;
    const willRefParent: LNode[] = [];
    if ((owner as unknown as { frame?: { isFrame: boolean } }).frame?.isFrame) {
      return willRefParent;
    }
    let t = 0;
    // если родитель принадлежит списку

    if (parent.list.parentNode) {
      let pnode: LNode | null | undefined = parent;

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

    const tab = Math.round((owner.x - parent.x) / GRID.x);
    if (tab < 0) {
      if (this.parentNode) {
        willRefParent.push(...this.clearParent());
      }
      return willRefParent;
    }

    // удаляем из списком прошлого родителя
    if (this.parentNode) {
      const oldParent = this.parentNode;
      oldParent.list.children?.delete(owner);
      (oldParent.vNode as any)?.refreshListBtns?.();
      willRefParent.push(oldParent);
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
    (parent.vNode as any)?.refreshListBtns?.();
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
    isRoot = true,
    isDrag = false,
    animate = false,
    oldPositions?: Map<LNode, { x: number; y: number }>,
    customOldFrameRect?: DOMRect | null,
  ) {
    if (!this.children?.size) return 0;

    const owner = this.owner;
    let oldFrameRect: DOMRect | null = null;
    if (customOldFrameRect !== undefined) {
      oldFrameRect = customOldFrameRect;
    } else if (
      isRoot &&
      animate &&
      (owner as unknown as { frame?: { isFrame: boolean } }).frame?.isFrame &&
      owner.vNode?.elFrameBg
    ) {
      oldFrameRect = owner.getNodeRect();
    }

    const m = [...this.children].sort(
      (a, b) => (a.list.index ?? 0) - (b.list.index ?? 0),
    );
    let h = 0;
    const startY = owner.y + (owner.vNode?.height ?? 0);
    const baseX = parentX ?? owner.x;

    for (const child of m) {
      if (child.hidden) continue;
      const prevPos = oldPositions?.get(child);
      const oldX = prevPos ? prevPos.x : child.x;
      const oldY = prevPos ? prevPos.y : child.y;

      child.x = owner.x + GRID.x * (child.list.tab ?? 0);
      child.y = startY + h;
      totalIndex++;
      child.list.totalIndex = totalIndex;

      const chVNode = child.vNode;
      if (chVNode) {
        const xx = Math.round((child.x - baseX) / GRID.x);
        const strTab = xx.toString();
        const tabChanged = chVNode.body.dataset.totaltab !== strTab;
        if (tabChanged) {
          chVNode.body.dataset.totaltab = strTab;
        }

        // При драге геометрия нод не меняется (пропуск для 60/120 FPS).
        // При обычной перестройке замеряем реальные размеры с учетом переноса текста.
        if (!isDrag || tabChanged || !chVNode.height) {
          chVNode.refreshBodyRect();
        }

        if (
          animate &&
          (oldX !== child.x || oldY !== child.y) &&
          typeof (chVNode as any).animateMove === "function"
        ) {
          (chVNode as any).animateMove(oldX, oldY, child.x, child.y);
        }

        chVNode.applyPosition();
        h += chVNode.height;
      }

      h += child.list.setPositionForChildren(
        baseX,
        totalTab + Math.round((child.x - baseX) / GRID.x),
        totalIndex,
        false,
        isDrag,
        animate,
        oldPositions,
      );
    }
    if (isRoot) {
      owner.vNode?.renderSVG(animate, oldFrameRect);
    }
    return h;
  }
}
