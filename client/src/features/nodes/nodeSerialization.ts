import { core, EVENTS } from "../core/core";
import Tools from "../core/Tools";
import { NODE_TYPES } from "./node-registry";
import { fromDB, toDB } from "@shared/types/INodeDB";
import type { INodeDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "../core/interfaces";
import type { NodeManager } from "./NodeManager";
import type { LNode } from "./LNode/LNode";
import type { LNode_Page } from "./LNode/LNode_Page";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import { applyTreeVisibility } from "./nodeTreeUtils";
import { areNodesEqual } from "./snapshotUtils";

export function instantiateSubgraph(
  manager: NodeManager,
  rawNodes: INodeDB[],
  offset: { x: number; y: number },
): LNode[] {
  if (!rawNodes.length) return [];

  const lidMap = new Map<number, number>();
  const idMap = new Map<string, string>();
  const createdNodes: LNode[] = [];

  for (const nodeData of rawNodes) {
    const rawType = nodeData.T ?? (nodeData as any).type;
    const isFrameAdaptation =
      rawType === NODE_TYPES.FRAME.main || rawType === 21;
    const type = isFrameAdaptation
      ? NODE_TYPES.TEXT_EDIT.id
      : (rawType ?? 0);
    const node = manager.addNode(type);

    fromDB(nodeData, node);

    if (isFrameAdaptation) {
      (node as LNode_TextEdit).frame.isFrame = true;
    }

    const oldId = nodeData._id;
    node._id = Tools.generateObjectId();
    if (oldId) {
      idMap.set(oldId, node._id);
    }

    const oldLID = node.lID;
    if (oldLID) {
      const newLID = manager.generateLID();
      lidMap.set(oldLID, newLID);
      node.lID = newLID;
    } else if ((node as LNode_TextEdit).frame?.isFrame) {
      node.lID = manager.generateLID();
    }

    node.pageId = core.mode.deskId;
    node.inTrash = false;
    node.hiddenBD = false;
    node.hidden = false;

    const originalX = nodeData.x ?? 0;
    const originalY = nodeData.y ?? 0;
    node.x = Tools.getDiskPosition(originalX + offset.x);
    node.y = Math.round(originalY + offset.y);

    if (nodeData.exData) {
      node.exData = structuredClone(nodeData.exData);
    }

    createdNodes.push(node);
  }

  for (const node of createdNodes) {
    if (node.list.parentLID) {
      node.list.parentLID = lidMap.get(node.list.parentLID);
    }

    const rawLNode = node as LNode & {
      outFrameLID?: number | undefined;
      isLockedInOutFrame?: boolean | undefined;
    };
    if (rawLNode.outFrameLID) {
      const mappedOutLID = lidMap.get(rawLNode.outFrameLID);
      if (mappedOutLID !== undefined) {
        rawLNode.outFrameLID = mappedOutLID;
      } else {
        rawLNode.outFrameLID = undefined;
        rawLNode.isLockedInOutFrame = false;
      }
    }

    if (node.clones) {
      if (node.clones.mainNodeLID && lidMap.has(node.clones.mainNodeLID)) {
        node.clones.mainNodeLID = lidMap.get(node.clones.mainNodeLID)!;
      }
      if (node.clones.sourceNodeId && idMap.has(node.clones.sourceNodeId)) {
        node.clones.sourceNodeId = idMap.get(node.clones.sourceNodeId)!;
      }
    }

    const frame = (node as LNode_TextEdit).frame;
    if (frame) {
      frame.parentsLID = frame.parentsLID
        .map((id) => lidMap.get(id))
        .filter((id): id is number => id !== undefined);
    }

    manager.registerNode(node);
    manager.spatialIndex.insert(node);

    if (core.serverPersistence) {
      core.serverPersistence.createNode(node, (id: string) => {
        if (id && id !== node._id) {
          manager.unregisterNode(node);
          node._id = id;
          manager.registerNode(node);
        }
      });
    }
    core.store.emit(EVENTS.node.created, node);
  }

  for (const node of createdNodes) {
    if (node.list.parentLID) {
      const parentNode = manager.getNodeByLID(node.list.parentLID);
      if (parentNode) {
        node.list.initParent(parentNode);
      }
    }
  }

  manager.initCloneLinks();

  for (const node of createdNodes) {
    core.nodeRenderer?.createVNode(node);
    node.repeatMode.refreshIndicator();
  }

  const createdFrames = createdNodes.filter(
    (n) => (n as LNode_TextEdit).frame?.isFrame,
  ) as LNode_TextEdit[];

  for (const frameNode of createdFrames) {
    frameNode.frame.init();
  }
  for (const frameNode of createdFrames) {
    frameNode.frame.initBtns();
  }
  for (const frameNode of createdFrames) {
    frameNode.frame.setBtnsState();
  }

  for (const node of createdNodes) {
    node.vNode?.refreshBodyRect();
  }

  const updatedRoots = new Set<LNode>();
  for (const node of createdNodes) {
    if (!node.list.parentNode) {
      applyTreeVisibility(node);
    }
    const root = node.list.mainParent || node;
    if (!updatedRoots.has(root)) {
      updatedRoots.add(root);
      root.list.setPositionForChildren();
      root.list.checkTree();
      root.vNode?.renderSVG();
      root.save();
    }
    node.save();
    manager.spatialIndex.update(node);
  }

  for (const frameNode of createdFrames) {
    frameNode.frame.redrawPaths();
  }

  return createdNodes;
}

function processNodeLinksAndCompatibility(node: LNode, manager: NodeManager) {
  node.forCompatibility();

  // конвертация старой версии clones
  if (node.exData?.ownerNodesIds) {
    const sourceNodeId = node.exData.ownerNodesIds[0];
    if (sourceNodeId) {
      const mainNode = manager.getNodeById(sourceNodeId);
      if (mainNode) {
        manager.ensureLID(mainNode);
        node.clones.mainNode = mainNode;
        node.exData.ownerNodesIds = undefined;
        node.save();
      }
    }
  }

  // если дата repeatMode вышла, то показывает
  if (node.repeatMode.date) {
    const now = new Date();
    if (node.repeatMode.date < now && node.hiddenBD) {
      node.hiddenBD = false;
      node.save();
    }
  }
  // показываем кому быть видимым кому нет
  node.hidden = node.hiddenBD;
  if (node.isLockedInOutFrame) return;
  if (node.list.parentLID && node.list.parentLID !== node.lID) {
    const parentNode = manager.getNodeByLID(node.list.parentLID);
    if (parentNode) {
      if (node.list.parentNode !== parentNode) {
        if (node.list.parentNode) {
          node.list.parentNode.list.children?.delete(node);
          node.list.parentNode.list.invalidateChildrenOrder();
          node.list.parentNode.vNode?.refreshListBtns?.();
        }
        node.list.initParent(parentNode);
      }
    }
  } else if (node.list.parentNode) {
    node.list.parentNode.list.children?.delete(node);
    node.list.parentNode.list.invalidateChildrenOrder();
    node.list.parentNode.vNode?.refreshListBtns?.();
    node.list.parentNode = null;
  }
}

export interface DiffSnapshotOptions {
  isDelta?: boolean | undefined;
  dirtyNodes?: Set<LNode> | undefined;
}

function isNodeBeingEdited(node: LNode, dirtyNodes?: Set<LNode>): boolean {
  if (dirtyNodes?.has(node)) return true;
  if (
    typeof document !== "undefined" &&
    document.activeElement &&
    node.vNode?.body?.contains(document.activeElement)
  ) {
    return true;
  }
  return false;
}

export function diffDeskSnapshot(
  manager: NodeManager,
  snapshot: DeskSnapshot,
  options?: DiffSnapshotOptions,
): void {
  const isDelta = options?.isDelta ?? false;
  const dirtyNodes = options?.dirtyNodes;
  const snapshotNodes = snapshot.nodes || [];
  const snapshotMap = new Map<string, INodeDB>();

  for (const rawData of snapshotNodes) {
    const id = rawData._id;
    if (!id) continue;
    const nodeData = { ...rawData };
    const rawType = nodeData.T ?? (nodeData as any).type;
    if (rawType === NODE_TYPES.FRAME.main || rawType === 21) {
      nodeData.T = NODE_TYPES.TEXT_EDIT.id;
    }
    snapshotMap.set(id, nodeData);
  }

  const existingMap = new Map<string, LNode>();
  const toRemove: LNode[] = [];

  for (const node of manager.nodes) {
    if (node.isLockedInOutFrame) continue;
    if (!node._id) continue;
    existingMap.set(node._id, node);

    if (isNodeBeingEdited(node, dirtyNodes)) {
      continue;
    }

    const freshData = snapshotMap.get(node._id);
    if (isDelta) {
      if (freshData && (freshData.inTrash || freshData.ok)) {
        toRemove.push(node);
      }
    } else {
      if (!freshData || freshData.inTrash || freshData.ok) {
        toRemove.push(node);
      }
    }
  }

  // 1. Удаляем отсутствующие / помеченные в корзину
  for (const node of toRemove) {
    node.remove();
    manager.unregisterNode(node);
    manager.spatialIndex.remove(node);
    existingMap.delete(node._id!);
  }

  const addedNodes: LNode[] = [];
  const updatedNodes: LNode[] = [];

  // 2. Добавляем новые и обновляем изменившиеся
  for (const [id, nodeData] of snapshotMap) {
    if (nodeData.inTrash || nodeData.ok) continue;
    const existing = existingMap.get(id);

    if (existing) {
      if (isNodeBeingEdited(existing, dirtyNodes)) {
        continue;
      }
      const currentDB = toDB(existing);
      if (!areNodesEqual(currentDB, nodeData)) {
        console.log("[DEBUG diffDeskSnapshot updated]", { id, nodeData_T: nodeData.T, currentDB_T: currentDB.T });
        fromDB(nodeData, existing);
        manager.registerNode(existing);
        updatedNodes.push(existing);
      }
    } else {
      const rawType = nodeData.T ?? (nodeData as any).type;
      const isFrameAdaptation =
        rawType === NODE_TYPES.FRAME.main || rawType === 21;
      const newNode = manager.addNode(
        isFrameAdaptation ? NODE_TYPES.TEXT_EDIT.id : rawType || 0,
      );
      console.log("[DEBUG diffDeskSnapshot added]", { id, rawType, nodeData_T: nodeData.T, keys: Object.keys(nodeData) });
      if (!newNode) continue;
      fromDB(nodeData, newNode);
      if (isFrameAdaptation) {
        (newNode as LNode_TextEdit).frame.isFrame = true;
        newNode.save();
      }
      manager.registerNode(newNode);
      addedNodes.push(newNode);
    }
  }

  // Рендерим новые ноды в DOM
  for (const node of addedNodes) {
    core.nodeRenderer.createVNode(node);
    manager.spatialIndex.insert(node);
  }

  // Защита от коллизий lID с сохранением целостности дерева
  const seenLIDs = new Map<number, LNode>();
  for (const node of manager.nodes) {
    if (node.isLockedInOutFrame) continue;
    if (!node.lID) continue;

    const existing = seenLIDs.get(node.lID);
    if (!existing) {
      seenLIDs.set(node.lID, node);
      continue;
    }

    // При коллизии нода с зависимыми связями (дети, фреймы) сохраняет lID,
    // а уступающая нода каскадно переназначается через reassignNodeLID
    const nodeHasLinks =
      (node.list?.children?.size ?? 0) > 0 ||
      (node.frame?.children?.size ?? 0) > 0;
    const existingHasLinks =
      (existing.list?.children?.size ?? 0) > 0 ||
      (existing.frame?.children?.size ?? 0) > 0;

    let targetToReassign = node;
    if (nodeHasLinks && !existingHasLinks) {
      targetToReassign = existing;
      seenLIDs.set(node.lID, node);
    }

    const newLID = manager.generateLID();
    manager.reassignNodeLID(targetToReassign, newLID);
    seenLIDs.set(newLID, targetToReassign);
  }

  // Обновляем визуализацию изменившихся
  for (const node of updatedNodes) {
    processNodeLinksAndCompatibility(node, manager);
    node.vNode?.applyPosition();
    node.vNode?.render();
    node.repeatMode.refreshIndicator();
    manager.spatialIndex.update(node);
    if (node.clones?.nodes && node.clones.nodes.size > 0) {
      node.clones.nodes.forEach((cloneNode) => {
        cloneNode.vNode?.render();
      });
    }
  }

  for (const node of addedNodes) {
    processNodeLinksAndCompatibility(node, manager);
  }

  // 3. Обновляем pageNode
  if (snapshot.pageNode) {
    if (!manager.pageNode) {
      manager.pageNode = manager.addNode(NODE_TYPES.PAGE.id) as LNode_Page;
    }
    fromDB(snapshot.pageNode, manager.pageNode);
    core.desk?.updateTitle();
  }

  // 4. Дерево видимости и связи
  manager.nodes.forEach((node) => {
    if (!node.list.parentNode) {
      applyTreeVisibility(node);
    }
    if (node.type === NODE_TYPES.PAGE.id) {
      (node as LNode_Page).checkOutNodesMode();
    }
  });

  manager.initCloneLinks();
  manager.setPositionForAllLinkedChildNodes();

  for (const node of updatedNodes) {
    node.vNode?.renderSVG();
  }
  for (const node of addedNodes) {
    node.vNode?.renderSVG();
  }
}

export function loadDeskSnapshot(
  manager: NodeManager,
  snapshot: DeskSnapshot,
): void {
  if (!snapshot || !Array.isArray(snapshot.nodes)) return;

  if (manager.nodes.size > 0) {
    diffDeskSnapshot(manager, snapshot);
    return;
  }

  manager.clear();

  for (const nodeData of snapshot.nodes) {
    const { _id } = nodeData;
    if (!_id) continue;

    // адаптация - переделываю тип фреймов, в ноду фрейм
    let isFrameAdaptation = false;
    let rawType = nodeData.T ?? (nodeData as any).type;
    if (rawType === NODE_TYPES.FRAME.main || rawType === 21) {
      nodeData.T = NODE_TYPES.TEXT_EDIT.id;
      rawType = NODE_TYPES.TEXT_EDIT.id;
      isFrameAdaptation = true;
    }
    const node = manager.addNode(rawType || 0);
    console.log("[DEBUG loadDeskSnapshot]", { id: _id, rawType, nodeData_T: nodeData.T, keys: Object.keys(nodeData) });
    if (!node) continue;
    fromDB(nodeData, node);
    manager.registerNode(node);

    // адаптация - переделываю тип фреймов, в ноду фрейм
    if (isFrameAdaptation) {
      (node as LNode_TextEdit).frame.isFrame = true;
      node.save();
    }
  }

  if (snapshot.pageNode) {
    manager.pageNode = manager.addNode(NODE_TYPES.PAGE.id) as LNode_Page;
    fromDB(snapshot.pageNode, manager.pageNode);
  }

  manager.nodes.forEach((node) => {
    processNodeLinksAndCompatibility(node, manager);
  });

  manager.nodes.forEach((node) => {
    if (!node.list.parentNode) {
      applyTreeVisibility(node);
    }
    if (node.type === NODE_TYPES.PAGE.id) {
      (node as LNode_Page).checkOutNodesMode();
    }
  });

  manager.initCloneLinks();

  core.store.emit(EVENTS.NodeManager.reInitAlnodes, undefined);
}
