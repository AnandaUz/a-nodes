

export interface INode {
  _id?: string;
  ownerId?: string;
  pageId?: string;
  inTrash?: boolean;
  lastUpdate?: Date;
  type?: number;
  x?: number;
  y?: number;
  title?: string | undefined;
}
