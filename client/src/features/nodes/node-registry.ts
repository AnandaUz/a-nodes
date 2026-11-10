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

export interface NodeTypeDescriptor {
  type: number;
  key: string;
  label: string;
  shortcut?: string;
  LNodeClass: NodeConstructor;
  VNodeClass?: any;
  capabilities?: {
    canClone?: boolean;
    canFrame?: boolean;
    canList?: boolean;
  };
}

export const NODE_REGISTRY: Record<number, NodeConstructor> = {};
export const NODE_DESCRIPTORS: Record<number, NodeTypeDescriptor> = {};

export function registerNodeTypeDescriptor(descriptor: NodeTypeDescriptor): void {
  NODE_DESCRIPTORS[descriptor.type] = descriptor;
  NODE_REGISTRY[descriptor.type] = descriptor.LNodeClass;
}

export function getNodeDescriptor(type: number): NodeTypeDescriptor | undefined {
  return NODE_DESCRIPTORS[type];
}

export function getAllNodeDescriptors(): NodeTypeDescriptor[] {
  return Object.values(NODE_DESCRIPTORS);
}

export function registerNodeType(
  type: number,
  constructor: NodeConstructor,
): void {
  NODE_REGISTRY[type] = constructor;
  if (!NODE_DESCRIPTORS[type]) {
    NODE_DESCRIPTORS[type] = {
      type,
      key: `type_${type}`,
      label: `Node ${type}`,
      LNodeClass: constructor,
    };
  } else {
    NODE_DESCRIPTORS[type].LNodeClass = constructor;
  }
}

