import type { INodeDB } from "@shared/types/INodeDB";

export interface DeskSnapshot {
  nodes: INodeDB[];
  pageNode: INodeDB | null;
}
export interface Command {
  execute: () => void;
  undo: () => void;
}
