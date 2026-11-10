import { GRID } from "@/features/core/CONST";
import type { LNode } from "./LNode";
import type TList from "./TList";

let isLayoutRunning = false;

/**
 * @contract
 *   Предусловия: owner должен иметь непустой список детей (list.children).
 *   Постусловия: обновляет координаты x, y всех потомков с шагом GRID.x и высотами vNode,
 *                возвращает общую суммарную высоту h поддерева.
 * @invariants
 *   Горизонтальный отступ каждого потомка: owner.x + GRID.x * tab.
 *   Вертикальный порядок строго соответствует list.index.
 */
export function setPositionForChildren(
  list: TList,
  owner: LNode,
  parentX: number | undefined = undefined,
  _totalTab = 0,
  totalIndex = 0,
  isRoot = true,
  isDrag = false,
  animate = false,
  oldPositions?: Map<LNode, { x: number; y: number }>,
  customOldFrameRect?: DOMRect | null,
): number {
  if (!list.children?.size) return 0;
  if (isRoot && isLayoutRunning) return 0;

  if (isRoot) {
    isLayoutRunning = true;
  }
  try {
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

    const baseX = parentX ?? owner.x;
    const isFrame = !!(
      (owner as unknown as { frame?: { isFrame: boolean } }).frame?.isFrame ||
      (owner.list.mainParent as unknown as { frame?: { isFrame: boolean } })?.frame?.isFrame
    );

    if (isRoot) {
      // Фаза 1: Топология, табы и классы фрейма (Top-Down)
      propagateTabsAndFrameClass(owner, baseX, isFrame);

      // Фаза 2: Пакетный замер размеров блоков (Batch Measurement)
      measureSubtree(owner, isDrag);
    }

    // Фаза 3: Расчет координат списка и позиционирование (Vertical Layout)
    const startY = owner.y + (owner.vNode?.height ?? 0);
    const totalIndexRef = { count: totalIndex };
    const h = layoutTree(owner, startY, animate, oldPositions, totalIndexRef);

    // Фаза 4: Геометрия фона, Z-index и связей (Bounding Box & Background & Paths)
    if (isRoot) {
      owner.vNode?.renderSVG(animate, oldFrameRect);
      const frameOwner = owner as unknown as {
        frame?: { isFrame: boolean; bringToFront(): void; redrawPaths(): void };
      };
      if (frameOwner.frame?.isFrame) {
        frameOwner.frame.bringToFront();
        frameOwner.frame.redrawPaths();
      }
    }
    return h;
  } finally {
    if (isRoot) {
      isLayoutRunning = false;
    }
  }
}

/**
 * @contract
 *   Предусловия: поддерево node уже сбалансировано по структуре.
 *   Постусловия: синхронизирует абсолютные координаты x, y для всех дочерних узлов без анимации.
 */
export function syncChildrenCoordinates(
  node: LNode,
  startY: number = node.y + (node.vNode?.height ?? 0),
): number {
  if (!node.list.children?.size) return 0;
  const m = node.list.getSortedChildren();
  let h = 0;
  for (const child of m) {
    child.x = node.x + GRID.x * (child.list.tab ?? 0);
    if (child.hidden) continue;
    child.y = startY + h;
    const chH = child.vNode?.height || 0;
    h += chH;
    if (child.list.children?.size) {
      h += syncChildrenCoordinates(child, child.y + chH);
    }
  }
  return h;
}

function propagateTabsAndFrameClass(
  parent: LNode,
  baseX: number,
  isFrame: boolean,
  depth = 0,
): void {
  if (depth > 25) return;
  if (!parent.list.children?.size) return;
  const m = parent.list.getSortedChildren();
  for (const child of m) {
    child.x = parent.x + GRID.x * (child.list.tab ?? 0);
    if (child.hidden) continue;
    const xx = Math.round((child.x - baseX) / GRID.x);
    const strTab = xx.toString();
    const chVNode = child.vNode;
    if (chVNode?.body) {
      if (chVNode.body.dataset && chVNode.body.dataset.totaltab !== strTab) {
        chVNode.body.dataset.totaltab = strTab;
        chVNode._tabChanged = true;
      }
      if (chVNode.body.classList) {
        if (isFrame) {
          if (!chVNode.body.classList.contains("in-frame")) {
            chVNode.body.classList.add("in-frame");
            chVNode._tabChanged = true;
          }
        } else {
          if (chVNode.body.classList.contains("in-frame")) {
            chVNode.body.classList.remove("in-frame");
            chVNode._tabChanged = true;
          }
        }
      }
      if (chVNode.body.style && chVNode.body.style.width !== "") {
        chVNode.body.style.width = "";
      }
    }
    propagateTabsAndFrameClass(child, baseX, isFrame, depth + 1);
  }
}

function measureSubtree(node: LNode, isDrag: boolean): void {
  const nodesToMeasure: LNode[] = [];
  const collect = (n: LNode) => {
    const vNode = n.vNode;
    if (vNode && typeof vNode.refreshBodyRect === "function") {
      const tabChanged = Boolean(vNode._tabChanged);
      if (!isDrag || tabChanged || !vNode.height) {
        nodesToMeasure.push(n);
      }
    }
    if (n.list.children?.size) {
      for (const child of n.list.children) {
        if (!child.hidden) collect(child);
      }
    }
  };
  collect(node);

  for (const n of nodesToMeasure) {
    n.vNode?.refreshBodyRect?.();
    if (n.vNode) n.vNode._tabChanged = false;
  }
}

function layoutTree(
  node: LNode,
  startY: number,
  animate: boolean,
  oldPositions?: Map<LNode, { x: number; y: number }>,
  totalIndexRef = { count: 0 },
  depth = 0,
): number {
  if (depth > 25) return 0;
  node.list._cachedRect = null;
  if (!node.list.children?.size) return 0;
  const m = node.list.getSortedChildren();
  let h = 0;
  let x0 = node.x;
  let y0 = node.y;
  let x1 = node.x + (node.vNode?.width ?? 0);
  let y1 = node.y + (node.vNode?.height ?? 0);

  for (const child of m) {
    if (child.hidden) continue;
    const prevPos = oldPositions?.get(child);
    const oldX = prevPos ? prevPos.x : child.x;
    const oldY = prevPos ? prevPos.y : child.y;

    child.y = startY + h;
    totalIndexRef.count++;
    child.list.totalIndex = totalIndexRef.count;

    const chVNode = child.vNode;
    if (chVNode) {
      if (
        animate &&
        (oldX !== child.x || oldY !== child.y) &&
        typeof chVNode.animateMove === "function"
      ) {
        chVNode.animateMove(oldX, oldY, child.x, child.y);
      }
      const skipChildSVG = !(chVNode.elSVG || chVNode.elFrameBg);
      chVNode.applyPosition(skipChildSVG);
      h += chVNode.height;
    }

    if (child.list.children?.size) {
      h += layoutTree(
        child,
        child.y + (child.vNode?.height ?? 0),
        animate,
        oldPositions,
        totalIndexRef,
        depth + 1,
      );
      const childRect = child.list._cachedRect ?? child.getNodeRect(true);
      x0 = Math.min(x0, childRect.x);
      y0 = Math.min(y0, childRect.y);
      x1 = Math.max(x1, childRect.x + childRect.width);
      y1 = Math.max(y1, childRect.y + childRect.height);
    } else {
      const chW = chVNode?.width ?? 0;
      const chH = chVNode?.height ?? 0;
      child.list._cachedRect = {
        x: child.x,
        y: child.y,
        width: chW,
        height: chH,
      } as DOMRect;
      x0 = Math.min(x0, child.x);
      y0 = Math.min(y0, child.y);
      x1 = Math.max(x1, child.x + chW);
      y1 = Math.max(y1, child.y + chH);
    }
  }

  node.list._cachedRect = {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
  } as DOMRect;

  return h;
}
