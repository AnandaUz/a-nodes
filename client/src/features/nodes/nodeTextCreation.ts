import { core } from "../core/core";
import { GRID } from "../core/CONST";
import Tools from "../core/Tools";
import { NODE_TYPES } from "./node-registry";
import type { NodeManager } from "./NodeManager";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import type VTextEdit from "./VNode/VTextEdit";

export async function addTextEditNodeByEnter(
  manager: NodeManager,
  e: KeyboardEvent,
): Promise<void> {
  Tools.stopEvent(e);

  if (core.mode.selectedVNodeCount !== 1) return;
  if (!core.mode.textEditing) return;

  const node = core.selectManager.selectedNodes.values().next()
    .value as LNode_TextEdit;
  const title = node.title || "";
  const vNode = node.vNode as VTextEdit;

  if (!title) {
    vNode.moveAniTo(null, (node.y ?? 0) + 25);
    return;
  }

  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  const cursorIndex = Tools.getCursorIndex(vNode.titleEl, range);

  const leftText = title.slice(0, cursorIndex).trimEnd();
  const rightText = title.slice(cursorIndex).trimStart();

  vNode.title = leftText;
  vNode.refreshBodyRect();
  vNode.render();
  manager.ensureLID(node);

  node.turnOff_EditTitleMode();
  core.selectManager.clearSelection();

  const options = {
    x: node.x,
    y: node.y + vNode.height,
    title: rightText,
  } as Partial<LNode>;
  if (node.type === NODE_TYPES.TEXT_EDIT_CLONE.id) {
    options.type = NODE_TYPES.TEXT_EDIT.id;
  }

  const newNode = manager.copyNode(node, options) as LNode_TextEdit;
  if (newNode) {
    core.nodeRenderer.createVNode(newNode);

    newNode.list.setParent(node, 0);

    const mainNode = node.list.mainParent as LNode_TextEdit;
    if (mainNode?.frame?.isFrame) {
      newNode.vNode?.body.classList.add("in-frame");
      newNode.frame.addPowerBtns();
      mainNode.list.setPositionForChildren();
      mainNode.vNode?.renderSVG();
      mainNode.frame.bringToFront();
    } else if (mainNode) {
      mainNode.list.setPositionForChildren();
      mainNode.vNode?.renderSVG();
    }
    (node.vNode as any)?.refreshListBtns?.();

    core.selectManager.selectNode(newNode);
    (newNode as any).isCreatedByEnter = true;
    (newNode as any).turnOn_EditTitleMode?.();

    if (core.history) {
      core.history.push({
        execute: () => {
          node.title = leftText;
          vNode.title = leftText;
          vNode.refreshBodyRect();
          vNode.render();
          node.save();
          manager.restoreNodeFromTrash(newNode);
        },
        undo: () => {
          node.title = title;
          vNode.title = title;
          vNode.refreshBodyRect();
          vNode.render();
          node.save();
          manager.putNodeInTrash(newNode);
        },
      });
    }
  }
}

export function addTextEditNodeUnderSelected(
  manager: NodeManager,
  selectedNode: LNode_TextEdit,
): LNode_TextEdit | null {
  let parent: LNode;
  let targetIndex: number;

  if (selectedNode.list?.parentNode) {
    parent = selectedNode.list.parentNode;
    targetIndex = (selectedNode.list.index ?? 0) + 1.1;
  } else {
    parent = selectedNode;
    targetIndex = (selectedNode.list?.children?.size ?? 0) + 0.6;
  }

  const newX = selectedNode.list?.parentNode
    ? selectedNode.x
    : selectedNode.x + GRID.x;
  const newY =
    (selectedNode.y ?? 0) + ((selectedNode.vNode as any)?.height || 25);

  manager.ensureLID(parent);

  const newNode = manager.createNode({
    x: newX,
    y: newY,
    type: NODE_TYPES.TEXT_EDIT.id,
  }) as LNode_TextEdit;

  if (newNode) {
    if (core.nodeRenderer) {
      core.nodeRenderer.createVNode(newNode);
    }

    newNode.list.setParent(parent, targetIndex);
    newNode.save();

    const mainNode = (selectedNode.list?.mainParent ||
      parent.list?.mainParent ||
      parent) as LNode_TextEdit;
    if (mainNode?.frame?.isFrame) {
      newNode.vNode?.body?.classList.add("in-frame");
      newNode.frame?.addPowerBtns();
      mainNode.list.setPositionForChildren();
      mainNode.vNode?.renderSVG();
      mainNode.frame?.bringToFront();
    } else if (mainNode) {
      mainNode.list.setPositionForChildren();
      mainNode.vNode?.renderSVG();
    }

    (selectedNode.vNode as any)?.refreshListBtns?.();
    (parent.vNode as any)?.refreshListBtns?.();

    core.selectManager.clearSelection();
    core.selectManager.selectNode(newNode);
    newNode.turnOn_EditTitleMode?.();
    return newNode;
  }

  return null;
}

