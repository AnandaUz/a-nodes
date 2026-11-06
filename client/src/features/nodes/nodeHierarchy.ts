import { core } from "../core/core";
import { GRID } from "../core/CONST";
import { NODE_TYPES } from "./node-registry";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import type VTextEdit from "@features/nodes/VNode/VTextEdit";
import type { NodeManager } from "./NodeManager";
import { getRectForNodes, gatherSubtree } from "./nodeTreeUtils";

export function initCloneLinks(
  nodes: Iterable<LNode>,
  getNodeByLID: (lID: number) => LNode | undefined,
): void {
  const allNodes = [...nodes];
  const clones = allNodes.filter(
    (node) => node.type === NODE_TYPES.TEXT_EDIT_CLONE.id,
  );

  const sourceNodes = new Set<LNode_TextEdit>();

  for (const node of clones as LNode_TEClone[]) {
    let mainNode: LNode_TextEdit | undefined;
    if (node.clones.sourceNodeId) {
      mainNode = allNodes.find(
        (n) => n._id === node.clones.sourceNodeId,
      ) as LNode_TextEdit | undefined;
    }
    if (!mainNode) {
      mainNode = getNodeByLID(
        node.clones.mainNodeLID || 0,
      ) as LNode_TextEdit;
    }
    if (!mainNode) continue;
    node.clones.mainNode = mainNode;
    if (mainNode._id) {
      node.clones.sourceNodeId = mainNode._id;
    }
    mainNode.clones.nodes.add(node);
    if (mainNode.type === NODE_TYPES.TEXT_EDIT.id) {
      sourceNodes.add(mainNode);
    }
  }

  // для каждого ресурсного устанавливаем все его клоны
  sourceNodes.forEach((sourceNode: LNode) => {
    sourceNode.clones.sourceNode = sourceNode;
    sourceNode.clones.doForAll((cloneNode: LNode) => {
      cloneNode.clones.sourceNode = sourceNode;
      cloneNode.init();
    });
  });
}

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

export function handleSelectedNodesMoved(manager: NodeManager): void {
  const selectedNodes = core.selectManager.selectedNodes;
  if (selectedNodes.size < 1) return;

  const movedNodes = new Set(selectedNodes.values());
  const visited = new Set<LNode>();

  selectedNodes.forEach((node) => {
    gatherSubtree(node, visited, movedNodes);
  });

  const movedNodeRect = getRectForNodes(movedNodes);

  const overRect = {
    x: movedNodeRect.x,
    y: movedNodeRect.y - 1,
    width: movedNodeRect.width,
    height: movedNodeRect.height + 1,
  } as DOMRect;

  const selectedParentsNodes: LNode[] = [];
  const refFunc = (node: LNode) => {
    const parentNode = node.list.parentNode;
    if (parentNode && selectedNodes.has(parentNode)) return;
    selectedParentsNodes.push(node);
  };
  selectedNodes.forEach((node: LNode) => refFunc(node));
  selectedParentsNodes.sort((a, b) => a.y - b.y);

  const frameNodes: LNode_TextEdit[] = [];
  const regularNodes: LNode[] = [];
  selectedParentsNodes.forEach((node) => {
    if ((node as any).frame?.isFrame) {
      frameNodes.push(node as LNode_TextEdit);
    } else {
      regularNodes.push(node);
    }
  });

  const refNode = regularNodes[0] || selectedParentsNodes[0];
  const refRoot = refNode?.list?.mainParent;

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
    const refNode = regularNodes[0] || selectedParentsNodes[0];
    if (!refNode) return true;
    const tab = Math.round((refNode.x - candRoot.x) / GRID.x);
    return tab >= 0;
  });

  const byNode = validCandidates?.[0];

  frameNodes.forEach((fn) => {
    fn.save();
    fn.frame.bringToFront();
    fn.frame.redrawPaths();
  });

  const wasRef = new Set<LNode>();
  if (byNode) {
    const willRefParent: LNode[] = [];
    const baseIndex = byNode.list.index || 0;
    const refNode = regularNodes[0] || selectedParentsNodes[0];
    const isSiblingAfter =
      byNode.list.parentNode && refNode && refNode.x <= byNode.x;

    regularNodes.forEach((node, i) => {
      if ((node as any).isLockedInOutFrame) {
        const mainParent = node.list.mainParent || node.list.parentNode;
        const byNodeRoot = byNode.list?.mainParent || byNode;
        if (mainParent !== byNodeRoot) {
          if (mainParent) willRefParent.push(mainParent);
          return;
        }
      }

      if (overRect.y < byNode.y && byNode.list.parentNode) {
        const parentNode = byNode.list.parentNode;
        manager.ensureLID(parentNode);
        willRefParent.push(
          ...node.list.setParent(parentNode, baseIndex + i * 0.01),
        );
      } else if (isSiblingAfter && byNode.list.parentNode) {
        const parentNode = byNode.list.parentNode;
        manager.ensureLID(parentNode);
        willRefParent.push(
          ...node.list.setParent(parentNode, baseIndex + 0.5 + i),
        );
      } else {
        manager.ensureLID(byNode);
        willRefParent.push(...node.list.setParent(byNode, i));
      }
    });

    willRefParent.forEach((node) => {
      const mainParent = node.list.mainParent;
      if (!mainParent) return;
      if (wasRef.has(mainParent)) return;
      wasRef.add(mainParent);

      const oldPositions = new Map<LNode, { x: number; y: number }>();
      const oldFrameRect =
        (mainParent as any).frame?.isFrame && mainParent.vNode?.elFrameBg
          ? mainParent.getNodeRect()
          : null;
      mainParent.list.forEachChildren((ch) => {
        oldPositions.set(ch, { x: ch.x, y: ch.y });
      });

      mainParent.list.setPositionForChildren(
        undefined,
        0,
        0,
        true,
        false,
        false,
      );
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

      if ((mainParent as any).frame?.isFrame) {
        const fp = mainParent as LNode_TextEdit;
        fp.frame.initBtns();
        fp.frame.setBtnsState();
      }

      mainParent.list.forEachChildren((child) => {
        (child.vNode as any)?.refreshListBtns?.();
      });
      (mainParent.vNode as any)?.refreshListBtns?.();

      mainParent.save();
    });
  } else {
    const willRefParent: LNode[] = [];
    regularNodes.forEach((node) => {
      if ((node as any).isLockedInOutFrame) {
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
          const isStillInList =
            nodeRect.x < listRect.x + listRect.width + GRID.x &&
            nodeRect.x + nodeRect.width > listRect.x - GRID.x &&
            nodeRect.y <= listRect.y + listRect.height + toleranceY &&
            nodeRect.y + nodeRect.height >= listRect.y - toleranceY;

          if (isStillInList) {
            willRefParent.push(mainParent);
            return;
          }
        }
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

    willRefParent.forEach((node) => {
      const mainParent = node.list.mainParent;
      if (!mainParent) return;
      if (wasRef.has(mainParent)) return;
      wasRef.add(mainParent);

      const oldPositions = new Map<LNode, { x: number; y: number }>();
      const oldFrameRect =
        (mainParent as any).frame?.isFrame && mainParent.vNode?.elFrameBg
          ? mainParent.getNodeRect()
          : null;
      mainParent.list.forEachChildren((ch) => {
        oldPositions.set(ch, { x: ch.x, y: ch.y });
      });

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

      mainParent.save();
    });
  }
}
