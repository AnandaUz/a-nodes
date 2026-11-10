import Tools from "@/features/core/Tools";
import { GRID } from "@/features/core/CONST";
import { core } from "@/features/core/core";
import type { LNode } from "./LNode";
import type TList from "./TList";

/**
 * @contract
 *   Предусловия: owner — корневой или промежуточный узел иерархии списка.
 *   Постусловия: производит балансировку табов (tab) и индексов (index) всех потомков
 *                относительно уровней отступа GRID.x; исключает циклические ссылки.
 * @invariants
 *   Ни один ребенок не может иметь tab > lastLevel + 1.
 */
export function checkTree(owner: LNode): void {
  if (owner.type === 4) return;
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
  const levelsParents: TLevelParent[] = [];
  levelsParents[-1] = { node: owner, count: 0 };
  let lastLevel = 0;

  list.forEach((chNode, index) => {
    if (index === 0) return;
    if (!chNode) return;

    const rawTabIndex =
      chNode.hidden || chNode.hiddenBD
        ? (chNode.list.tab ?? 0)
        : Math.round(
            (Tools.getDiskPosition(chNode.x) - Tools.getDiskPosition(owner.x)) /
              GRID.x,
          );

    const parentIsExcluded =
      chNode.list.parentNode && excluded.has(chNode.list.parentNode);

    if (rawTabIndex < 0 || parentIsExcluded) {
      excluded.add(chNode);
      chNode.list.clearParent();
      chNode.save();
      return;
    }

    const tabIndex = Math.min(rawTabIndex, lastLevel + 1);
    lastLevel = tabIndex;

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
      oldParent?.list.invalidateChildrenOrder();
      oldParent?.list.invalidateRectCache();
      oldParent?.vNode?.refreshListBtns?.();
      const s = mParent?.node.list;
      if (s && !s.children) s.children = new Set();
      s?.children?.add(chNode);
      s?.invalidateChildrenOrder();
      s?.invalidateRectCache();
      mParent?.node.vNode?.refreshListBtns?.();
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

/**
 * @contract
 *   Предусловия: owner прикреплен или открепляется от list.parentNode.
 *   Постусловия: очищает родительские ссылки, сбрасывает tab = 0, удаляет клоны при необходимости,
 *                возвращает список родителей, требующих обновления геометрии.
 */
export function clearParent(list: TList, owner: LNode): LNode[] {
  if (owner.isLockedInOutFrame) {
    return list.parentNode ? [list.parentNode] : [];
  }
  const willRefParent: LNode[] = [];
  const parentNode = list.parentNode;
  if (parentNode) {
    parentNode.list.children?.delete(owner);
    parentNode.list.invalidateChildrenOrder();
    parentNode.list.invalidateRectCache();
    parentNode.vNode?.refreshListBtns?.();
    willRefParent.push(parentNode);

    const isRepeat =
      (owner.repeatMode?.mode ?? 0) > 0 ||
      !!owner.repeatMode?.date;
    if ((owner.hiddenBD || owner.hidden) && !isRepeat) {
      owner.hiddenBD = false;
      owner.hidden = false;
      owner.vNode?.show();
      owner.vNode?.refreshIndicators?.();
      if (list.children?.size) {
        list.forEachChildren((child) => {
          const childIsRepeat =
            (child.repeatMode?.mode ?? 0) > 0 || !!child.repeatMode?.date;
          if (!child.hiddenBD && !childIsRepeat) {
            child.hidden = false;
            child.vNode?.show();
            child.vNode?.refreshIndicators?.();
          }
        });
        list.setPositionForChildren();
      }
    }
  }
  list.parentLID = undefined;
  list.parentNode = null;
  list.index = undefined;
  list.tab = 0;
  if ((owner as any).clones?.nodes?.size) {
    core.nodeManager?.removeAllClones(owner as any);
  }
  if (owner.vNode?.body) {
    delete owner.vNode.body.dataset.totaltab;
    owner.vNode.refreshBodyRect();
  }
  owner.save();

  return willRefParent;
}

function isDescendant(candidate: LNode, root: LNode): boolean {
  let curr: LNode | null | undefined = candidate.list.parentNode;
  const seen = new Set<LNode>();
  while (curr && !seen.has(curr)) {
    if (curr === root) return true;
    seen.add(curr);
    curr = curr.list.parentNode;
  }
  return false;
}

/**
 * @contract
 *   Предусловия: parent !== owner и parent не является потомком owner (защита от циклов).
 *   Постусловия: устанавливает parent в качестве родителя owner с индексом newIndex и табом по GRID.x,
 *                возвращает список узлов, требующих перерасчета геометрии.
 */
export function setParent(
  list: TList,
  owner: LNode,
  parent: LNode,
  newIndex: number,
): LNode[] {
  const willRefParent: LNode[] = [];
  if (parent === owner || isDescendant(parent, owner)) {
    return willRefParent;
  }
  if (parent && !parent.lID && core.nodeManager) {
    core.nodeManager.ensureLID(parent);
  }
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
    if (list.parentNode) {
      willRefParent.push(...list.clearParent());
    }
    return willRefParent;
  }

  // удаляем из списком прошлого родителя
  if (list.parentNode) {
    const oldParent = list.parentNode;
    oldParent.list.children?.delete(owner);
    oldParent.list.invalidateChildrenOrder();
    oldParent.list.invalidateRectCache();
    oldParent.vNode?.refreshListBtns?.();
    willRefParent.push(oldParent);
  }

  const oldParentNode = list.parentNode;
  list.parentNode = parent;
  list.tab = Math.max(0, tab);
  // если изменился родитель
  if (oldParentNode != parent) {
    owner.refresh();
  }

  if (!parent.list.children) parent.list.children = new Set();
  parent.list.children.add(owner);

  const siblings = [...parent.list.children]
    .filter((ch) => ch !== owner)
    .sort((a, b) => (a.list.index ?? 0) - (b.list.index ?? 0));

  const targetIdx = Math.max(0, Math.min(Math.round(newIndex), siblings.length));
  siblings.splice(targetIdx, 0, owner);

  siblings.forEach((node, index) => {
    if (node.list && node.list.index !== index) {
      node.list.index = index;
      node.save();
    }
  });

  parent.list.invalidateChildrenOrder();
  parent.list.invalidateRectCache();
  parent.vNode?.refreshListBtns?.();

  willRefParent.push(owner);
  return willRefParent;
}

export { setPositionForChildren, syncChildrenCoordinates } from "./listLayout";

