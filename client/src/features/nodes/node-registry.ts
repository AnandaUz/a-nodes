import type { VNode } from "./VNode";
import VTextEdit from "./VTextEdit";
import type { INode } from "@shared/types";
export const NODE_TYPES = {
     TEXT_EDIT: {
          id: 1
     }
}
export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

export const NODE_REGISTRY: Record<number, new (node: INode, container: HTMLElement) => VNode> = {
     [NODE_TYPES.TEXT_EDIT.id]: VTextEdit,
};

