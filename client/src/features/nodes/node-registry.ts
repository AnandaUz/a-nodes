import type { LNode } from "@features/nodes/LNode/LNode";

export const NODE_TYPES = {
  TEXT_EDIT: {
    id: 1,
  },
  FRAME: {
    main: 201, // оставляяю для совместимости
  },
  TEXT_EDIT_CLONE: {
    id: 3,
  },
  PAGE: {
    id: 4,
  },
};
export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export type NodeConstructor = new () => LNode;

export const NODE_REGISTRY: Record<number, NodeConstructor> = {};

export function registerNodeType(
  type: number,
  constructor: NodeConstructor,
): void {
  NODE_REGISTRY[type] = constructor;
}

