export type NodeType = Number;

export interface INode {
  _id?: string;
  ownerId?: string;
  parentId?: string;
  inTrash?: boolean;
  lastUpdate?: Date;
  x?: number;
  y?: number;
}
