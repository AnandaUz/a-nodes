import { core, EVENTS } from "../core/core";
import Tools from "../core/Tools";
import { NODE_TYPES } from "./node-registry";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import type { Command } from "../core/interfaces";
import type { NodeManager } from "./NodeManager";

/**
 * @contract
 *   Предусловия: узел node зарегистрирован в NodeManager.
 *   Постусловия: помечает узел как inTrash (или обновляет дату повтора),
 *                удаляет из SpatialIndex и отключает зависимые элементы.
 * @invariants
 *   Если withClones=true, рекурсивно отправляет в корзину все клоны.
 */
export function putNodeInTrash(
  manager: NodeManager,
  node: LNode,
  withClones: boolean = false,
): void {
  if (node.repeatMode.mode > 0 || node.repeatMode.date) {
    if (node.repeatMode.mode > 0) {
      const nextDate = Tools.getNextWeekday(node.repeatMode.mode);
      nextDate.setHours(0, 0, 0, 0);
      node.repeatMode.date = nextDate;
    }
    node.hide();
    node.save();
    node.remove();
  } else {
    node.inTrash = true;
    node.save();
    core.store.emit(EVENTS.node.inTrash, node);
    manager.unregisterNode(node);
    manager.spatialIndex.remove(node);
    node.remove();
  }

  if (withClones) {
    (node as LNode_TextEdit).clones.doForAll((cloneNode) => {
      putNodeInTrash(manager, cloneNode, false);
    });
    return;
  }

  // отключаем паур кнопку
  if (node.type === NODE_TYPES.TEXT_EDIT.id && node.clones?.mainNode) {
    const main = node.clones.mainNode;
    if (
      main.type === NODE_TYPES.TEXT_EDIT.id &&
      main.frame &&
      typeof node.frame?.frameLID === "number"
    ) {
      main.frame.turnOff_PowerBtn(node.frame.frameLID);
    }
  }
}

/**
 * @contract
 *   Предусловия: узел node находится в корзине (inTrash = true).
 *   Постусловия: восстанавливает узел, возвращает в SpatialIndex и восстанавливает родительские связи.
 */
export function restoreNodeFromTrash(
  manager: NodeManager,
  node: LNode,
  withClones: boolean = false,
): void {
  node.inTrash = false;
  manager.registerNode(node);
  manager.spatialIndex.insert(node);

  if (node.hiddenBD) {
    node.hiddenBD = false;
  }
  node.hidden = false;

  if (!node.vNode && core.nodeRenderer) {
    core.nodeRenderer.createVNode(node);
  } else {
    node.vNode?.show();
  }

  if (node.list?.parentLID) {
    const parentNode = manager.getNodeByLID(node.list.parentLID);
    if (parentNode && !parentNode.inTrash) {
      if (!parentNode.list.children) parentNode.list.children = new Set();
      parentNode.list.children.add(node);
      node.list.parentNode = parentNode;
      parentNode.vNode?.refreshListBtns?.();
    }
  }

  const mainParent =
    node.list?.mainParent ||
    (node.list?.parentNode ? node.list.parentNode.list?.mainParent : null);
  if (mainParent) {
    mainParent.list.setPositionForChildren();
    mainParent.vNode?.renderSVG();
  } else {
    node.list?.setPositionForChildren();
    node.vNode?.renderSVG();
  }

  node.save();
  core.store.emit(EVENTS.node.created, node);

  if (withClones) {
    (node as LNode_TextEdit).clones?.doForAll((cloneNode) => {
      restoreNodeFromTrash(manager, cloneNode, false);
    });
    return;
  }

  if (node.type === NODE_TYPES.TEXT_EDIT.id && node.clones?.mainNode) {
    const main = node.clones.mainNode;
    if (main.type === NODE_TYPES.TEXT_EDIT.id) {
      main.frame?.setBtnsState();
    }
  }
}

/**
 * @contract
 *   Создает команду для стека History с возможностью execute() (удаление) и undo() (восстановление).
 */
export function createDeleteCommand(
  manager: NodeManager,
  node: LNode,
  withClones: boolean = false,
): Command {
  const parentNode = node.list?.parentNode;
  const parentLID = node.list?.parentLID;
  const index = node.list?.index ?? 0;
  const tab = node.list?.tab ?? 0;
  const children = node.list?.children ? Array.from(node.list.children) : [];
  const posX = node.x;
  const posY = node.y;

  return {
    execute: () => {
      putNodeInTrash(manager, node, withClones);
    },
    undo: () => {
      restoreNodeFromTrash(manager, node, withClones);
      node.x = posX;
      node.y = posY;
      if (parentNode && !parentNode.inTrash) {
        node.list.setParent(parentNode, index);
        node.list.tab = tab;
      } else if (parentLID) {
        const p = manager.getNodeByLID(parentLID);
        if (p && !p.inTrash) {
          node.list.setParent(p, index);
          node.list.tab = tab;
        }
      }
      children.forEach((child) => {
        if (!child.inTrash) {
          child.list.setParent(node, child.list.index ?? 0);
        }
      });
      const root = node.list?.mainParent || node;
      root.list?.setPositionForChildren();
      root.vNode?.renderSVG();
      node.save();
    },
  };
}

export function removeAllClones(manager: NodeManager, node: LNode): void {
  if (node.clones) {
    node.clones.nodes.forEach((clone) => {
      putNodeInTrash(manager, clone);
    });
    node.clones.removeAllClones();
  }
}

export function hardDeleteNode(manager: NodeManager, node: LNode): void {
  const parent = node.list?.parentNode;
  const mainParent = node.list?.mainParent;

  if (node.list) {
    node.list.clearParent();
  }

  core.serverPersistence.deleteNode(node);
  core.selectManager.unselectNode(node);
  manager.unregisterNode(node);
  manager.spatialIndex.remove(node);
  node.remove();

  if (mainParent) {
    mainParent.list?.setPositionForChildren();
  } else if (parent) {
    parent.list?.setPositionForChildren();
  }
}

