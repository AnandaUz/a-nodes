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
  const clones = [...nodes].filter(
    (node) => node.type === NODE_TYPES.TEXT_EDIT_CLONE.id,
  );

  const sourceNodes = new Set<LNode_TextEdit>();

  for (const node of clones as LNode_TEClone[]) {
    const mainNode = getNodeByLID(
      node.clones.mainNodeLID || 0,
    ) as LNode_TextEdit;
    if (!mainNode) continue;
    node.clones.mainNode = mainNode;
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

  const candidates = core.selectManager
    .getNodeOverRect(overRect)
    .filter((node) => !movedNodes.has(node));

  candidates.sort((a, b) => a.y - b.y);

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
    regularNodes.forEach((node, i) => {
      if (overRect.y < byNode.y && byNode.list.parentNode) {
        const parentNode = byNode.list.parentNode;
        manager.ensureLID(parentNode);
        willRefParent.push(
          ...node.list.setParent(parentNode, baseIndex - 0.6 + i * 0.01),
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
      const mainParent = (node as LNode_TextEdit).clones.mainNode;
      if (mainParent) {
        const frameLID = node.list.mainParent?.lID || 0;
        node.list.totalIndex = -1;
        (mainParent.vNode as VTextEdit).removePowerIndicators(frameLID);
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
