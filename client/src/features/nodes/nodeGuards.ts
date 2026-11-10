import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import type { LNode_TEClone } from "./LNode/LNode_TEClone";
import type { LNode_Page } from "./LNode/LNode_Page";
import type { VNode } from "./VNode/VNode";
import type VTextEdit from "./VNode/VTextEdit";
import { NODE_TYPES } from "./node-registry";

export interface IFrameCapableNode extends LNode {
  frame: NonNullable<LNode["frame"]>;
}

export function isTextEditNode(node?: LNode | null): node is LNode_TextEdit {
  return !!node && (node.type === NODE_TYPES.TEXT_EDIT.id || ("frame" in node && typeof (node as any).turnOn_EditTitleMode === "function"));
}

export function isCloneNode(node?: LNode | null): node is LNode_TEClone {
  return !!node && node.type === NODE_TYPES.TEXT_EDIT_CLONE.id;
}

export function isPageNode(node?: LNode | null): node is LNode_Page {
  return !!node && node.type === NODE_TYPES.PAGE.id;
}

export function hasFrame(node?: LNode | null): node is IFrameCapableNode {
  return !!node && !!node.frame;
}

export function isVTextEdit(vNode?: VNode | null): vNode is VTextEdit {
  return !!vNode && typeof (vNode as any).refreshListBtns === "function";
}

