import Tools from "@/features/core/Tools";
import { LNode } from "./LNode";
import { GRID } from "@/features/core/CONST";
import { core } from "@/features/core/core";

export default class TList {
  private owner: LNode;
  parentLID?: number | undefined;
  parentNode?: LNode | null;
  index?: number;
  tab?: number;
  children?: Set<LNode>;
  constructor(owner: LNode) {
    this.owner = owner;
  }
  /** проверяем дерево выстроенно верно или случились ошибки */
  checkTree() {
    const owner = this.owner;
    const descendants: LNode[] = [];
    const gather = (node: LNode) => {
      if (node.list?.children) {
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
      if (chNode.list && chNode.list?.parentNode !== mParent?.node) {
        chNode.list?.parentNode?.list?.children?.delete(chNode);
        const s = mParent?.node.list;
        if (s && !s.children) s.children = new Set();
        s?.children?.add(chNode);
        chNode.list.parentNode = mParent?.node || null;
        chNode.list.parentLID = mParent?.node?.lID || 0;

        console.log("тут!!!!");
        isChanged = true;
      }
      if (mParent && chNode && chNode.list?.index !== mParent.count) {
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
      parentNode.list?.children?.delete(this.owner);
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

    if (parent.list?.parentNode) {
      let pnode: LNode | null | undefined = parent;
      newIndex = (parent.list?.index ?? 0) + 0.1;

      t = Math.round((owner.x - parent.x) / GRID.x);
      if (t <= 0) {
        let tt = 10;
        while (t <= 0) {
          if (!pnode?.list?.parentNode) break;

          newIndex = (pnode.list?.index ?? 0) + 0.5;
          pnode = pnode?.list?.parentNode;

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
      this.parentNode.list?.children?.delete(owner);
      willRefParent.push(this.parentNode);
    }
    this.parentLID = parent.lID ?? 0;
    this.parentNode = parent;
    this.index = newIndex - 0.5;
    this.tab = tab;

    if (!parent.list.children) parent.list.children = new Set();
    parent.list.children.add(owner);
    const m = [...parent.list.children].sort(
      (a, b) => (a.list?.index ?? 0) - (b.list?.index ?? 0),
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
  getMainParent(): LNode | null {
    let parent: LNode = this.owner;
    while (parent.list?.parentNode) {
      parent = parent.list.parentNode;
    }
    return parent;
  }
  setPositionForChildren(parentX: number | undefined = undefined) {
    if (this.children?.size) {
      const owner = this.owner;
      const m = [...this.children].sort(
        (a, b) => (a.list?.index ?? 0) - (b.list?.index ?? 0),
      );
      let h = 0;
      const startY = owner.y + (owner.vNode?.height ?? 0);
      for (const child of m) {
        child.x = owner.x + GRID.x * (child.list?.tab ?? 0);
        child.y = startY + h;
        child.vNode?.applyPosition();
        const xx = Math.round((child.x - (parentX || owner.x)) / GRID.x);

        const chVNode = child.vNode;
        if (chVNode) {
          chVNode.body.dataset.totaltab = xx.toString();
          chVNode.refreshBodyRect();
        }

        h += chVNode?.height ?? 0;
        h += child.list.setPositionForChildren(parentX || owner.x);
      }
      return h;
    }
    return 0;
  }
}
