import type { LNode } from "./LNode";
import {
  checkTree,
  clearParent,
  setParent,
  setPositionForChildren,
} from "./listHierarchy";

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

  hasSimpleChildren(): boolean {
    if (!this.children?.size) return false;
    for (const child of this.children) {
      const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
      if (!child.hiddenBD && !isRepeat) {
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
    checkTree(this.owner);
  }
  /**  удаляем из списком прошлого родителя */
  clearParent(): LNode[] {
    return clearParent(this, this.owner);
  }
  setParent(parent: LNode, newIndex: number): LNode[] {
    return setParent(this, this.owner, parent, newIndex);
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
    return setPositionForChildren(
      this,
      this.owner,
      parentX,
      totalTab,
      totalIndex,
      isRoot,
      isDrag,
      animate,
      oldPositions,
      customOldFrameRect,
    );
  }
}
