import { core, EVENTS } from "../core/core";
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

function processNodeLinksAndCompatibility(node: LNode, manager: NodeManager) {
  node.forCompatibility();

  // конвертация старой версии clones
  if (node.exData?.ownerNodesIds) {
    const sourceNodeId = node.exData.ownerNodesIds[0];
    if (sourceNodeId) {
      const mainNode = [...manager.nodes.values()].find(
        (n) => n._id === sourceNodeId,
      );
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
  if (node.list.parentLID && node.list.parentLID !== node.lID) {
    const parentNode = manager.getNodeByLID(node.list.parentLID);
    if (parentNode) {
      node.list.initParent(parentNode);
    }
  }
}

function diffDeskSnapshot(manager: NodeManager, snapshot: DeskSnapshot): void {
  const snapshotNodes = snapshot.nodes || [];
  const snapshotMap = new Map<string, INodeDB>();

  for (const rawData of snapshotNodes) {
    const id = rawData._id;
    if (!id) continue;
    const nodeData = { ...rawData };
    if (nodeData.type === NODE_TYPES.FRAME.main || nodeData.type === 21) {
      nodeData.type = NODE_TYPES.TEXT_EDIT.id;
    }
    snapshotMap.set(id, nodeData);
  }

  const existingMap = new Map<string, LNode>();
  const toRemove: LNode[] = [];

  for (const node of manager.nodes) {
    if (!node._id) continue;
    existingMap.set(node._id, node);
    const freshData = snapshotMap.get(node._id);
    if (!freshData || freshData.inTrash || freshData.ok) {
      toRemove.push(node);
    }
  }

  // 1. Удаляем отсутствующие / помеченные в корзину
  for (const node of toRemove) {
    node.remove();
    manager.nodes.delete(node);
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
      const currentDB = toDB(existing);
      if (!areNodesEqual(currentDB, nodeData)) {
        fromDB(nodeData, existing);
        updatedNodes.push(existing);
      }
    } else {
      const isFrameAdaptation =
        nodeData.type === NODE_TYPES.FRAME.main || nodeData.type === 21;
      const newNode = manager.addNode(
        isFrameAdaptation ? NODE_TYPES.TEXT_EDIT.id : nodeData.type || 0,
      );
      if (!newNode) continue;
      fromDB(nodeData, newNode);
      if (isFrameAdaptation) {
        (newNode as LNode_TextEdit).frame.isFrame = true;
        newNode.save();
      }
      manager.nodes.add(newNode);
      addedNodes.push(newNode);
    }
  }

  // Рендерим новые ноды в DOM
  for (const node of addedNodes) {
    core.nodeRenderer.createVNode(node);
    manager.spatialIndex.insert(node);
  }

  // Обновляем визуализацию изменившихся
  for (const node of updatedNodes) {
    processNodeLinksAndCompatibility(node, manager);
    node.vNode?.applyPosition();
    node.vNode?.render();
    node.repeatMode.refreshIndicator();
    manager.spatialIndex.update(node);
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
    if (nodeData.type === NODE_TYPES.FRAME.main || nodeData.type === 21) {
      nodeData.type = NODE_TYPES.TEXT_EDIT.id;
      isFrameAdaptation = true;
    }
    const node = manager.addNode(nodeData.type || 0);
    if (!node) continue;
    fromDB(nodeData, node);
    manager.nodes.add(node);

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
  });

  manager.initCloneLinks();

  core.store.emit(EVENTS.NodeManager.reInitAlnodes, undefined);
}
