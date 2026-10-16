import { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode } from "@features/nodes/LNode/LNode";
import { LNode_Page } from "@features/nodes/LNode/LNode_Page";
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

export const NODE_REGISTRY: Record<number, new () => LNode> = {
  [NODE_TYPES.TEXT_EDIT.id]: LNode_TextEdit,
  [NODE_TYPES.TEXT_EDIT_CLONE.id]: LNode_TEClone,
  [NODE_TYPES.PAGE.id]: LNode_Page,
};
