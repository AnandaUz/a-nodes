import type TFrame from "@/features/nodes/LNode/TFrame";
import type { IExData } from "./IExData";

export interface ITList {
  parentLID?: number | undefined;
  index?: number;
  tab?: number;
}
export interface IFrame {
  isFrame: boolean;
  parentsLID?: number[];
}

export interface IClones {
  mainNodeLID?: number | undefined;
}

/** интерфейс для LNode */
export interface ILNode {
  _id: string | undefined;
  userId: string | undefined;
  pageId: string | undefined;
  inTrash: boolean | undefined;
  lastUpdate: Date | undefined;
  type: number;
  x: number;
  y: number;
  title?: string | undefined;
  list?: ITList;
  frame?: TFrame;
  lID?: number | undefined;
  hidden?: boolean;
  exData?: IExData | undefined;
  clones?: IClones;
}
