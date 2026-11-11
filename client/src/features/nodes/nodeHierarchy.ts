import { core } from "../core/core";
import { GRID } from "../core/CONST";
import {
  captureMoveHistoryNodes,
  commitMoveHistoryTransaction,
} from "../core/commands/historyCommands";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type VTextEdit from "@features/nodes/VNode/VTextEdit";
import type { NodeManager } from "./NodeManager";
import { getRectForNodes, gatherSubtree } from "./nodeTreeUtils";
import { DropSlotService, type IDropSlot } from "./DropSlotService";

export { initCloneLinks } from "./cloneHierarchy";

/**
 * @contract
 *   Предусловия: набор узлов nodes загружен на канвас.
 *   Постусловия: позиционирует всех потомков для каждого корневого узла дерева.
 */
export function setPositionForAllLinkedChildNodes(
  nodes: Iterable<LNode>,
): void {
  for (const node of nodes) {
    if (!node.list) continue;
    if (node.list.parentNode) continue;
    if (!node.list.children || node.list.children.size < 1) continue;
    node.list.setPositionForChildren();
  }
}

function adoptChildren(node: LNode, isShift: boolean): void {
  if (!isShift || !node.list.children?.size) return;
  const adoptParent = node.list.parentNode || node.list.mainParent;
  if (adoptParent && adoptParent !== node) {
    node.list.children.forEach((child) => {
      child.list.parentNode = adoptParent;
      if (!adoptParent.list.children) {
        adoptParent.list.children = new Set();
      }
      adoptParent.list.children.add(child);
    });
    adoptParent.list.invalidateChildrenOrder();
    adoptParent.list.invalidateRectCache();
    node.list.children.clear();
    node.list.invalidateChildrenOrder();
    node.list.invalidateRectCache();
    node.vNode?.refreshListBtns?.();
    adoptParent.vNode?.refreshListBtns?.();
  }
}

function separateSelectedNodes(selectedNodes: Set<LNode>) {
  const selectedParentsNodes: LNode[] = [];
  selectedNodes.forEach((node: LNode) => {
    const parentNode = node.list.parentNode;
    if (parentNode && selectedNodes.has(parentNode)) return;
    selectedParentsNodes.push(node);
  });
  selectedParentsNodes.sort((a, b) => a.y - b.y);

  const frameNodes: LNode_TextEdit[] = [];
  const regularNodes: LNode[] = [];
  selectedParentsNodes.forEach((node) => {
    if (node.frame?.isFrame) {
      frameNodes.push(node as LNode_TextEdit);
    } else {
      regularNodes.push(node);
    }
  });

  return { selectedParentsNodes, frameNodes, regularNodes };
}

function findDropCandidate(
  movedNodes: Set<LNode>,
  movedNodeRect: DOMRect | { x: number; y: number; width: number; height: number },
  refNode: LNode | undefined,
  refRoot: LNode | null | undefined,
  selectedParentsNodes: LNode[],
  regularNodes: LNode[],
) {
  const isExistingChild = Boolean(
    refNode?.list.parentNode && refRoot && refRoot !== refNode,
  );

  const overRectX =
    isExistingChild && refRoot
      ? Math.min(movedNodeRect.x, refRoot.x)
      : movedNodeRect.x;
  const overRectWidth =
    isExistingChild && refRoot
      ? Math.max(
          movedNodeRect.x + movedNodeRect.width,
          refRoot.x + (refRoot.vNode?.width || 100),
        ) - overRectX
      : movedNodeRect.width;

  const overRect = {
    x: overRectX,
    y: movedNodeRect.y - 1,
    width: overRectWidth,
    height: movedNodeRect.height + 1,
  } as DOMRect;

  const candidates = core.selectManager
    .getNodeOverRect(overRect)
    .filter((node) => {
      if (movedNodes.has(node)) return false;
      const candRect = node.vNode?.bodyRect || {
        x: node.x,
        y: node.y,
        width: 100,
        height: 30,
      };
      const overlapY =
        Math.min(
          movedNodeRect.y + movedNodeRect.height,
          candRect.y + candRect.height,
        ) - Math.max(movedNodeRect.y, candRect.y);
      const candRoot =
        node.list?.mainParent || (node.list?.children?.size ? node : null);
      const isSameTree = Boolean(refRoot && candRoot && refRoot === candRoot);
      const minOverlap = isSameTree
        ? Math.min(candRect.height, movedNodeRect.height) / 2
        : 1;
      return overlapY >= minOverlap;
    });

  candidates.sort((a, b) => a.y - b.y);

  const validCandidates = candidates.filter((cand) => {
    const candRoot = cand.list.mainParent || cand;
    const targetRef = regularNodes[0] || selectedParentsNodes[0];
    if (!targetRef) return true;
    const rootTab = Math.round((targetRef.x - candRoot.x) / GRID.x);
    if (rootTab < 0) return false;

    const isSibling = Boolean(
      cand.list.parentNode &&
      (overRect.y < cand.y || targetRef.x <= cand.x)
    );
    const expectedParent = isSibling ? cand.list.parentNode! : cand;
    const parentTab = Math.round((targetRef.x - expectedParent.x) / GRID.x);
    if (parentTab < 0) return false;
    if (parentTab > 2) return false;
    return true;
  });

  return { byNode: validCandidates[0], overRect };
}

function attachNodesToCandidate(
  manager: NodeManager,
  byNode: LNode,
  regularNodes: LNode[],
  selectedParentsNodes: LNode[],
  movedNodes: Set<LNode>,
  overRect: DOMRect,
  _refRoot: LNode | null | undefined,
  isShift: boolean,
  dropSlot?: IDropSlot | null,
): LNode[] {
  const willRefParent: LNode[] = [];
  const refNode = regularNodes[0] || selectedParentsNodes[0];
  const candRoot = byNode.list.mainParent || byNode;

  regularNodes.forEach((node) => {
    adoptChildren(node, isShift);
    if (node.list.parentNode) {
      const oldParent = node.list.parentNode;
      oldParent.list.children?.delete(node);
      oldParent.list.invalidateChildrenOrder();
      oldParent.list.invalidateRectCache();
      oldParent.vNode?.refreshListBtns?.();
      willRefParent.push(oldParent);
    }
  });

  let targetParent: LNode;
  let insertIndex: number;

  if (dropSlot) {
    targetParent = dropSlot.targetParent;
    const sorted = targetParent.list.getSortedChildren();
    let refInParent: LNode | null = null;
    let curr: LNode | null = dropSlot.byNode;
    while (curr && curr !== targetParent) {
      if (curr.list.parentNode === targetParent) {
        refInParent = curr;
        break;
      }
      curr = curr.list.parentNode;
    }
    if (refInParent) {
      const idx = sorted.indexOf(refInParent);
      insertIndex =
        idx !== -1
          ? dropSlot.isBefore && refInParent === dropSlot.byNode
            ? idx
            : idx + 1
          : sorted.length;
    } else {
      insertIndex = dropSlot.insertIndex;
    }
  } else {
    const isSiblingAfter =
      byNode.list.parentNode && refNode && refNode.x <= byNode.x;
    const isSibling = Boolean(
      byNode.list.parentNode &&
      (overRect.y < byNode.y || isSiblingAfter)
    );
    targetParent = isSibling ? byNode.list.parentNode! : byNode;
    const baseIndex = byNode.list.index || 0;
    insertIndex = overRect.y < byNode.y ? baseIndex : baseIndex + 1;

    if (refNode) {
      const rawTab = Math.round((refNode.x - targetParent.x) / GRID.x);
      if (rawTab > 2) {
        const targetX = targetParent.x + 2 * GRID.x;
        const deltaX = targetX - refNode.x;
        movedNodes.forEach((node) => {
          node.moveTo({ x: node.x + deltaX, y: node.y }, false);
          node.vNode?.refreshBodyRect?.();
        });
      } else if (rawTab < 0 && refNode.x >= candRoot.x) {
        const targetX = targetParent.x;
        const deltaX = targetX - refNode.x;
        movedNodes.forEach((node) => {
          node.moveTo({ x: node.x + deltaX, y: node.y }, false);
          node.vNode?.refreshBodyRect?.();
        });
      }
    }
  }

  regularNodes.forEach((node, i) => {
    if (node.isLockedInOutFrame) {
      const mainParent = node.list.mainParent || node.list.parentNode;
      const byNodeRoot = byNode.list?.mainParent || byNode;
      if (mainParent !== byNodeRoot) {
        if (mainParent) willRefParent.push(mainParent);
        return;
      }
    }

    manager.ensureLID(targetParent);
    willRefParent.push(
      ...node.list.setParent(targetParent, insertIndex + i),
    );
  });

  return willRefParent;
}

function detachOrKeepNodes(
  regularNodes: LNode[],
  movedNodes: Set<LNode>,
  isShift: boolean,
): LNode[] {
  const willRefParent: LNode[] = [];
  regularNodes.forEach((node) => {
    if (node.isLockedInOutFrame) {
      const mainParent = node.list.mainParent || node.list.parentNode;
      if (mainParent) {
        willRefParent.push(mainParent);
      }
      return;
    }

    const parentNode = node.list.parentNode;
    const mainParent = node.list.mainParent || parentNode;
    if (mainParent) {
      const otherNodes = new Set<LNode>();
      if (!movedNodes.has(mainParent)) {
        otherNodes.add(mainParent);
      }
      mainParent.list.forEachChildren((ch) => {
        if (!movedNodes.has(ch)) {
          otherNodes.add(ch);
        }
      });

      if (otherNodes.size > 0) {
        const listRect = getRectForNodes(otherNodes);
        const nodeRect = node.vNode?.bodyRect || {
          x: node.x,
          y: node.y,
          width: 100,
          height: 30,
        };
        const toleranceY = 5;
        const maxTabX = mainParent.x + 2 * GRID.x + GRID.x / 2;
        const isStillInList =
          node.x <= maxTabX &&
          nodeRect.x + nodeRect.width > listRect.x - GRID.x &&
          nodeRect.y <= listRect.y + listRect.height + toleranceY &&
          nodeRect.y + nodeRect.height >= listRect.y - toleranceY;

        if (isStillInList) {
          adoptChildren(node, isShift);
          willRefParent.push(mainParent);
          return;
        }
      }
    }

    adoptChildren(node, isShift);
    if (node.list.mainParent) {
      willRefParent.push(node.list.mainParent);
    }

    const cloneMain = (node as LNode_TextEdit).clones?.mainNode;
    if (cloneMain) {
      const frameLID = node.list.mainParent?.lID || 0;
      node.list.totalIndex = -1;
      (cloneMain.vNode as VTextEdit).removePowerIndicators(frameLID);
    }

    willRefParent.push(...node.list.clearParent());

    node.refresh();
    node.vNode?.renderSVG();
  });

  return willRefParent;
}

function refreshModifiedTrees(
  willRefParent: LNode[],
  wasRef: Set<LNode>,
  isCandidateDrop: boolean,
): void {
  willRefParent.forEach((node) => {
    const mainParent = node.list.mainParent;
    if (!mainParent) return;
    if (wasRef.has(mainParent)) return;
    wasRef.add(mainParent);

    const oldPositions = new Map<LNode, { x: number; y: number }>();
    const oldFrameRect =
      mainParent.frame?.isFrame && mainParent.vNode?.elFrameBg
        ? mainParent.getNodeRect()
        : null;
    mainParent.list.forEachChildren((ch) => {
      oldPositions.set(ch, { x: ch.x, y: ch.y });
    });

    if (isCandidateDrop) {
      mainParent.list.syncChildrenCoordinates();
    }
    mainParent.list.checkTree();
    mainParent.list.setPositionForChildren(
      undefined,
      0,
      0,
      true,
      false,
      true,
      oldPositions,
      oldFrameRect,
    );

    if (isCandidateDrop && mainParent.frame?.isFrame) {
      const fp = mainParent as LNode_TextEdit;
      fp.frame.initBtns();
      fp.frame.setBtnsState();
    }

    mainParent.list.forEachChildren((child) => {
      child.vNode?.refreshListBtns?.();
    });
    mainParent.vNode?.refreshListBtns?.();

    mainParent.save();
  });
}

/**
 * @contract
 *   Предусловия: завершено перетаскивание узлов в core.selectManager.selectedNodes.
 *   Постусловия: пересчитывает привязку к родителям (присоединение к списку/фрейму или отсоединение),
 *                актуализирует координаты и фиксирует транзакцию перемещения в истории.
 * @invariants
 *   Все мутации графа транслируются в историю через commitMoveHistoryTransaction.
 */
export function handleSelectedNodesMoved(manager: NodeManager): void {
  const selectedNodes = core.selectManager.selectedNodes;
  if (selectedNodes.size < 1) return;

  const isShift = Boolean(core.mode.isShiftDrag || core.mode.mouseStatus.shift);
  const movedNodes = new Set(selectedNodes.values());
  const visited = new Set<LNode>();

  if (!isShift) {
    selectedNodes.forEach((node) => {
      gatherSubtree(node, visited, movedNodes);
    });
  }

  const movedNodeRect = getRectForNodes(movedNodes);
  const { selectedParentsNodes, frameNodes, regularNodes } =
    separateSelectedNodes(selectedNodes);

  const refNode = regularNodes[0] || selectedParentsNodes[0];
  const refRoot = refNode?.list?.mainParent;

  const dropSlot = DropSlotService.getInstance().consumeLastSlot();
  let byNode: LNode | undefined;
  let overRect: DOMRect;

  if (dropSlot) {
    byNode = dropSlot.byNode;
    if (refNode) {
      const targetX = dropSlot.indicatorX;
      const targetY = dropSlot.slotY;
      const deltaX = targetX - refNode.x;
      const deltaY = targetY - refNode.y;
      if (deltaX !== 0 || deltaY !== 0) {
        movedNodes.forEach((node) => {
          node.moveTo({ x: node.x + deltaX, y: node.y + deltaY }, false);
          node.vNode?.refreshBodyRect?.();
        });
      }
    }
    overRect = {
      x: dropSlot.indicatorX,
      y: dropSlot.isBefore ? byNode.y - 1 : byNode.y + 1,
      width: dropSlot.indicatorWidth,
      height: 20,
    } as DOMRect;
  } else {
    const res = findDropCandidate(
      movedNodes,
      movedNodeRect,
      refNode,
      refRoot,
      selectedParentsNodes,
      regularNodes,
    );
    byNode = res.byNode;
    overRect = res.overRect;
  }

  if (byNode) {
    captureMoveHistoryNodes([byNode]);
    if (byNode.list.parentNode) {
      captureMoveHistoryNodes([byNode.list.parentNode]);
    }
    if (dropSlot?.targetParent) {
      captureMoveHistoryNodes([dropSlot.targetParent]);
    }
  }
  regularNodes.forEach((node) => {
    if (node.list.parentNode) {
      captureMoveHistoryNodes([node.list.parentNode]);
    }
  });

  frameNodes.forEach((fn) => {
    fn.save();
    fn.frame.bringToFront();
    fn.frame.redrawPaths();
  });

  const wasRef = new Set<LNode>();
  if (byNode) {
    const willRefParent = attachNodesToCandidate(
      manager,
      byNode,
      regularNodes,
      selectedParentsNodes,
      movedNodes,
      overRect,
      refRoot,
      isShift,
      dropSlot,
    );
    refreshModifiedTrees(willRefParent, wasRef, true);
  } else {
    const willRefParent = detachOrKeepNodes(regularNodes, movedNodes, isShift);
    refreshModifiedTrees(willRefParent, wasRef, false);
  }

  core.mode.isShiftDrag = false;
  commitMoveHistoryTransaction(selectedNodes);
}
