import { core, EVENTS } from "../core/core";
import { NODE_TYPES } from "./node-registry";
import { fromDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "../core/interfaces";
import type { NodeManager } from "./NodeManager";
import type { LNode_Page } from "./LNode/LNode_Page";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import { applyTreeVisibility } from "./nodeTreeUtils";

export function loadDeskSnapshot(
  manager: NodeManager,
  snapshot: DeskSnapshot,
): void {
  if (!snapshot || !Array.isArray(snapshot.nodes)) return;
  manager.nodes.clear();

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
  });

  manager.nodes.forEach((node) => {
    if (!node.list.parentNode) {
      applyTreeVisibility(node);
    }
  });

  manager.initCloneLinks();

  core.store.emit(EVENTS.NodeManager.reInitAlnodes, undefined);
}
