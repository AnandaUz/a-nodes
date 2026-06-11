import type { INode } from "@shared/types";

export interface DeskSnapshot {
  nodes: INode[];
  pageNode: INode | null;
}
export interface Command {
  execute: () => void;
  undo: () => void;
}
