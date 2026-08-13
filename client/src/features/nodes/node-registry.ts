import VFrame_main from "./VFrame/VFrame_main";
// import VM_area_sub from "./VFrame/VM_area_sub";
import type { VNode } from "./VNode";
import VTextEdit from "./VTextEdit";
import type { INode } from "@shared/types";
import VTextEditClone from "./VTextEditClone";
import { VPage } from "./VPage";
export const NODE_TYPES = {
  TEXT_EDIT: {
    id: 1,
  },
  MANAGER: {
    area_main: 21,
    area_sub: 22,
  },
  TEXT_EDIT_CLONE: {
    id: 3,
  },
  PAGE: {
    id: 4,
  },
};
export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const NODE_REGISTRY: Record<
  number,
  new (node: INode, container: HTMLElement) => VNode
> = {
  [NODE_TYPES.TEXT_EDIT.id]: VTextEdit,
  [NODE_TYPES.MANAGER.area_main]: VFrame_main,
  // [NODE_TYPES.MANAGER.area_sub]: VM_area_sub,
  [NODE_TYPES.TEXT_EDIT_CLONE.id]: VTextEditClone,
  [NODE_TYPES.PAGE.id]: VPage,
};
