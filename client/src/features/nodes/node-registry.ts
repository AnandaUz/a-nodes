import VM_area_main from "./VManager/VM_area_main";
import VM_area_sub from "./VManager/VM_area_sub";
import type { VNode } from "./VNode";
import VTextEdit from "./VTextEdit";
import type { INode } from "@shared/types";
import VTextEditClone from "./VTextEditClone";
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
};
export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const NODE_REGISTRY: Record<
  number,
  new (node: INode, container: HTMLElement) => VNode
> = {
  [NODE_TYPES.TEXT_EDIT.id]: VTextEdit,
  [NODE_TYPES.MANAGER.area_main]: VM_area_main,
  [NODE_TYPES.MANAGER.area_sub]: VM_area_sub,
  [NODE_TYPES.TEXT_EDIT_CLONE.id]: VTextEditClone,
};
