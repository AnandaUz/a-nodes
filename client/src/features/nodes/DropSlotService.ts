import { core } from "@/features/core/core";
import { GRID } from "@/features/core/CONST";
import type { LNode } from "./LNode/LNode";
import { getNodeGlobalTab } from "./LNode/listHierarchy";
import { getRectForNodes, gatherSubtree } from "./nodeTreeUtils";

export const FIXED_DROP_INDICATOR_WIDTH = 120;
/** Допустимый отступ снизу (в px) от нижнего края дерева/фрейма для зоны привязки */
export const DROP_TREE_BOTTOM_MARGIN = 10;

export interface IDropSlot {
  root: LNode;
  byNode: LNode;
  targetParent: LNode;
  insertIndex: number;
  slotY: number;
  globalTab: number;
  indicatorX: number;
  indicatorY: number;
  indicatorWidth: number;
  isBefore: boolean;
}

export class DropSlotService {
  private static instance: DropSlotService | null = null;

  static getInstance(): DropSlotService {
    if (!DropSlotService.instance) {
      DropSlotService.instance = new DropSlotService();
    }
    return DropSlotService.instance;
  }

  private indicatorEl: SVGSVGElement | null = null;
  private lineEl: SVGLineElement | null = null;
  private lastSlot: IDropSlot | null = null;

  private ensureIndicator(): SVGSVGElement | null {
    if (typeof document === "undefined") return null;
    if (!this.indicatorEl) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "dnd-drop-slot-indicator");
      svg.style.cssText =
        "position:absolute;pointer-events:none;z-index:99999;overflow:visible;display:none;";

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", "5");
      circle.setAttribute("cy", "5");
      circle.setAttribute("r", "3.5");
      circle.setAttribute("stroke", "#2097D3");
      circle.setAttribute("stroke-width", "3");
      circle.setAttribute("fill", "#ffffff");

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", "8.5");
      line.setAttribute("y1", "5");
      line.setAttribute("x2", `${FIXED_DROP_INDICATOR_WIDTH}`);
      line.setAttribute("y2", "5");
      line.setAttribute("stroke", "#2097D3");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");

      svg.appendChild(circle);
      svg.appendChild(line);

      this.indicatorEl = svg;
      this.lineEl = line;

      core.desk?.nodesEl?.appendChild(svg);
    }
    if (
      this.indicatorEl &&
      core.desk?.nodesEl &&
      this.indicatorEl.parentElement !== core.desk.nodesEl
    ) {
      core.desk.nodesEl.appendChild(this.indicatorEl);
    }
    return this.indicatorEl;
  }

  showIndicator(x: number, y: number, _width?: number): void {
    const el = this.ensureIndicator();
    if (!el || !this.lineEl) return;
    el.style.left = `${x - 5}px`;
    el.style.top = `${y - 5}px`;
    el.style.width = `${FIXED_DROP_INDICATOR_WIDTH + 10}px`;
    el.style.height = "10px";
    this.lineEl.setAttribute("x1", "8.5");
    this.lineEl.setAttribute("y1", "5");
    this.lineEl.setAttribute("x2", `${FIXED_DROP_INDICATOR_WIDTH}`);
    this.lineEl.setAttribute("y2", "5");
    el.style.display = "block";
  }

  hideIndicator(): void {
    if (this.indicatorEl) {
      this.indicatorEl.style.display = "none";
    }
  }

  clear(): void {
    this.hideIndicator();
    this.lastSlot = null;
  }

  consumeLastSlot(): IDropSlot | null {
    const slot = this.lastSlot;
    this.clear();
    return slot;
  }

  getLastSlot(): IDropSlot | null {
    return this.lastSlot;
  }

  calculateSlot(movedNodes: Set<LNode>, isShift: boolean): IDropSlot | null {
    if (movedNodes.size === 0 || isShift) {
      return null;
    }

    const effectiveMovedNodes = new Set<LNode>(movedNodes);
    if (!isShift) {
      const visited = new Set<LNode>();
      for (const node of movedNodes) {
        gatherSubtree(node, visited, effectiveMovedNodes);
      }
    }

    const movedList = [...movedNodes];
    const regularNodes = movedList
      .filter(
        (n) =>
          !(n as unknown as { frame?: { isFrame: boolean } }).frame?.isFrame,
      )
      .sort((a, b) => a.y - b.y);
    const refNode = regularNodes[0] || movedList.sort((a, b) => a.y - b.y)[0];
    if (!refNode) return null;

    const refRoot = refNode.list?.mainParent || null;

    // Сбор деревьев-кандидатов на канвасе
    const candidateTrees: LNode[] = [];
    const allNodes = core.nodeManager?.nodes;
    if (allNodes) {
      for (const node of allNodes) {
        if (effectiveMovedNodes.has(node)) continue;
        if (node.hidden || node.hiddenBD || node.inTrash) continue;
        const isRoot = !node.list?.parentNode;
        if (isRoot) {
          candidateTrees.push(node);
        }
      }
    }

    // Если узел заблокирован во фрейме OUT
    if (refNode.isLockedInOutFrame && refRoot) {
      candidateTrees.length = 0;
      candidateTrees.push(refRoot);
    }

    const getTreeRect = (root: LNode): DOMRect => {
      const otherNodes = new Set<LNode>();
      if (!effectiveMovedNodes.has(root)) {
        otherNodes.add(root);
      }
      root.list.forEachChildren((ch) => {
        if (!effectiveMovedNodes.has(ch) && !ch.hidden && !ch.hiddenBD) {
          otherNodes.add(ch);
        }
      });
      if (otherNodes.size > 0) {
        return getRectForNodes(otherNodes);
      }
      return root.getNodeRect(false);
    };

    let targetRoot: LNode | null = null;
    let targetRootBBox: DOMRect | null = null;

    // Сначала проверяем родное дерево refRoot
    if (refRoot && candidateTrees.includes(refRoot)) {
      const rootRect = getTreeRect(refRoot);
      const paddingX = GRID.x * 2;
      const minX = rootRect.x - paddingX;
      const maxX = rootRect.x + rootRect.width;
      const minY = rootRect.y - 10;
      const maxY = rootRect.y + rootRect.height + DROP_TREE_BOTTOM_MARGIN;

      if (
        refNode.x >= minX &&
        refNode.x <= maxX &&
        refNode.y >= minY &&
        refNode.y <= maxY
      ) {
        targetRoot = refRoot;
        targetRootBBox = rootRect;
      }
    }

    // Если не в родном дереве, проверяем остальные
    if (!targetRoot) {
      let bestDist = Infinity;
      for (const treeRoot of candidateTrees) {
        const rootRect = getTreeRect(treeRoot);
        const paddingX = GRID.x * 2;
        const minX = rootRect.x - paddingX;
        const maxX = rootRect.x + rootRect.width;
        const minY = rootRect.y - 10;
        const maxY = rootRect.y + rootRect.height + DROP_TREE_BOTTOM_MARGIN;

        if (
          refNode.x >= minX &&
          refNode.x <= maxX &&
          refNode.y >= minY &&
          refNode.y <= maxY
        ) {
          const centerY = (minY + maxY) / 2;
          const dist = Math.abs(refNode.y - centerY);
          if (dist < bestDist) {
            bestDist = dist;
            targetRoot = treeRoot;
            targetRootBBox = rootRect;
          }
        }
      }
    }

    if (!targetRoot || !targetRootBBox) {
      return null;
    }

    const isFrame = Boolean(
      (targetRoot as unknown as { frame?: { isFrame: boolean } }).frame
        ?.isFrame,
    );

    // Собираем всех видимых потомков целевого дерева
    const visibleChildren: LNode[] = [];
    const gatherChildren = (node: LNode) => {
      if (!node.list.children) return;
      for (const child of node.list.children) {
        if (effectiveMovedNodes.has(child) || child.hidden || child.hiddenBD)
          continue;
        visibleChildren.push(child);
        gatherChildren(child);
      }
    };
    gatherChildren(targetRoot);
    visibleChildren.sort((a, b) => a.y - b.y);

    const rootHeight = targetRoot.vNode?.height || 30;
    let slotY = targetRoot.y + rootHeight;
    let byNode: LNode = targetRoot;
    let targetParent: LNode = targetRoot;
    let insertIndex = 0;
    let isBefore = false;
    let prevItem: LNode | null = null;

    const items: LNode[] = isFrame
      ? visibleChildren
      : [targetRoot, ...visibleChildren];

    if (items.length === 0) {
      slotY = targetRoot.y + rootHeight;
      byNode = targetRoot;
      targetParent = targetRoot;
      insertIndex = 0;
      isBefore = false;
      prevItem = targetRoot;
    } else if (refNode.y < items[0]!.y) {
      const first = items[0]!;
      slotY = isFrame ? targetRoot.y + rootHeight : first.y;
      byNode = first;
      isBefore = true;
      prevItem = null;
    } else {
      let placed = false;
      for (let i = 0; i < items.length - 1; i++) {
        const curr = items[i]!;
        const next = items[i + 1]!;

        if (refNode.y < next.y) {
          const currH = curr.vNode?.height || 30;
          slotY = curr.y + currH;
          byNode = next;
          isBefore = true;
          prevItem = curr;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = items[items.length - 1]!;
        const lastH = last.vNode?.height || 30;
        slotY = last.y + lastH;
        byNode = last;
        isBefore = false;
        prevItem = last;
      }
    }

    const rawGlobalTab = Math.round((refNode.x - targetRoot.x) / GRID.x);

    let maxAllowedTab = 2;
    if (prevItem) {
      const prevGlobalTab = getNodeGlobalTab(prevItem, targetRoot);
      maxAllowedTab = prevGlobalTab + 2;
    } else if (isFrame) {
      maxAllowedTab = 2;
    }

    const minAllowedTab = 0;
    const globalTab = Math.max(
      minAllowedTab,
      Math.min(rawGlobalTab, Math.max(0, maxAllowedTab)),
    );

    const indicatorX = targetRoot.x + globalTab * GRID.x;
    const indicatorY = slotY;
    const indicatorWidth = FIXED_DROP_INDICATOR_WIDTH;

    if (isBefore && byNode !== targetRoot) {
      const byNodeGlobalTab = getNodeGlobalTab(byNode, targetRoot);
      if (globalTab === byNodeGlobalTab) {
        targetParent = byNode.list.parentNode || targetRoot;
        insertIndex = byNode.list.index ?? 0;
      } else if (!prevItem || prevItem === targetRoot) {
        targetParent = targetRoot;
        insertIndex = 0;
      } else {
        let currItem: LNode = prevItem;
        while (
          currItem.list.parentNode &&
          currItem.list.parentNode !== targetRoot &&
          getNodeGlobalTab(currItem, targetRoot) > globalTab
        ) {
          currItem = currItem.list.parentNode;
        }
        const currGlobalTab = getNodeGlobalTab(currItem, targetRoot);
        if (globalTab > currGlobalTab) {
          targetParent = currItem;
          insertIndex = currItem.list.children?.size ?? 0;
        } else {
          targetParent = currItem.list.parentNode || targetRoot;
          insertIndex = (currItem.list.index ?? 0) + 1;
        }
      }
    } else if (!prevItem || prevItem === targetRoot) {
      if (!isFrame && globalTab === 0) {
        return null;
      }
      targetParent = targetRoot;
      insertIndex = 0;
    } else {
      let currItem: LNode = prevItem;
      while (
        currItem.list.parentNode &&
        currItem.list.parentNode !== targetRoot &&
        getNodeGlobalTab(currItem, targetRoot) > globalTab
      ) {
        currItem = currItem.list.parentNode;
      }

      const currGlobalTab = getNodeGlobalTab(currItem, targetRoot);
      if (globalTab > currGlobalTab) {
        targetParent = currItem;
        insertIndex = currItem.list.children?.size ?? 0;
      } else if (globalTab === currGlobalTab) {
        targetParent = currItem.list.parentNode || targetRoot;
        insertIndex = (currItem.list.index ?? 0) + 1;
      } else {
        targetParent = targetRoot;
        insertIndex = (currItem.list.index ?? 0) + 1;
      }
    }

    return {
      root: targetRoot,
      byNode,
      targetParent,
      insertIndex,
      slotY,
      globalTab,
      indicatorX,
      indicatorY,
      indicatorWidth,
      isBefore,
    };
  }

  update(movedNodes: Set<LNode>, isShift: boolean): void {
    const slot = this.calculateSlot(movedNodes, isShift);
    this.lastSlot = slot;
    if (slot) {
      this.showIndicator(slot.indicatorX, slot.indicatorY, slot.indicatorWidth);
    } else {
      this.hideIndicator();
    }
  }
}
