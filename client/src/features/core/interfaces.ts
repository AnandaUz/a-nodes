import type { INode } from "@shared/types";

export interface DeskSnapshot {
  nodes: INode[];
}
export interface Command {
  execute: () => void;
  undo: () => void;
}
