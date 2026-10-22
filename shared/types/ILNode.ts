import type { IExData } from "./IExData";

export interface ITList {
  parentLID?: number | undefined;
  index?: number | undefined;
  tab?: number | undefined;
  isListOpen?: boolean;
  isRepeatsOpen?: boolean;
  isHiddenOpen?: boolean;
}
export interface IFrame {
  isFrame: boolean;
  parents: { size: number };
  pack(): number[];
  parentsLID?: number[];
}

export interface IClones {
  mainNodeLID?: number | undefined;
}
export interface IRepeatMode {
  mode?: number;
  date?: Date | null;
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
  frame?: IFrame;
  lID?: number | undefined;
  hiddenBD?: boolean;
  exData?: IExData | undefined;
  clones?: IClones;
  repeatMode: IRepeatMode;
}
