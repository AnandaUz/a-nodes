import Tools from "@/features/core/Tools";
import { GRID } from "@/features/core/CONST";
import type { LNode } from "./LNode";
import type TList from "./TList";

export function checkTree(owner: LNode): void {
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

export function clearParent(list: TList, owner: LNode): LNode[] {
  const willRefParent: LNode[] = [];
  const parentNode = list.parentNode;
  if (parentNode) {
    parentNode.list.children?.delete(owner);
    (parentNode.vNode as any)?.refreshListBtns?.();
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
  if (owner.vNode?.body) {
    delete owner.vNode.body.dataset.totaltab;
    owner.vNode.refreshBodyRect();
  }
  owner.save();

  return willRefParent;
}

export function setParent(
  list: TList,
  owner: LNode,
  parent: LNode,
  newIndex: number,
): LNode[] {
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
    if (list.parentNode) {
      willRefParent.push(...list.clearParent());
    }
    return willRefParent;
  }

  // удаляем из списком прошлого родителя
  if (list.parentNode) {
    const oldParent = list.parentNode;
    oldParent.list.children?.delete(owner);
    (oldParent.vNode as any)?.refreshListBtns?.();
    willRefParent.push(oldParent);
  }

  list.index = newIndex - 0.5;
  list.tab = tab;
  const oldParentNode = list.parentNode;
  list.parentNode = parent;
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

export function setPositionForChildren(
  list: TList,
  owner: LNode,
  parentX: number | undefined = undefined,
  totalTab = 0,
  totalIndex = 0,
  isRoot = true,
  isDrag = false,
  animate = false,
  oldPositions?: Map<LNode, { x: number; y: number }>,
  customOldFrameRect?: DOMRect | null,
): number {
  if (!list.children?.size) return 0;

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

  const m = [...list.children].sort(
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
