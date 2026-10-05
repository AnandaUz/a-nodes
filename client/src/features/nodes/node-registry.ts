import { LNode_TEClone } from "./LNode/LNode_TEClone";
import { LNode_Frame_main } from "./LNode/LNode_Frame_main";
import { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { LNode_Page } from "./LNode/LNode_Page";
export const NODE_TYPES = {
  TEXT_EDIT: {
    id: 1,
  },
  FRAME: {
    main: 201,
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

  [21]: LNode_Frame_main, // для совместимости - прежний тип для фреймов 21
  [NODE_TYPES.FRAME.main]: LNode_Frame_main,
  [NODE_TYPES.TEXT_EDIT_CLONE.id]: LNode_TEClone,
  [NODE_TYPES.PAGE.id]: LNode_Page,
};
