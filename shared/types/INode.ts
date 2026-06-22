export interface INode {
  _id?: string;
  userId?: string;
  pageId?: string;
  inTrash?: boolean;
  lastUpdate?: Date;
  type?: number;
  x?: number;
  y?: number;
  title?: string;
  ok?: boolean;
  exData?: {
    ownerNodesIds?: string[];
    bgColor?: string;
    tColor?: string;
    repeatMode?: string;
    repeatDay?: Date;
    url?: string;
  };
}
