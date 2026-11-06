import type { INodeDB } from "@shared/types/INodeDB";

export interface BreadcrumbItem {
  id: string;
  title: string;
}

export interface DeskSnapshot {
  nodes: INodeDB[];
  pageNode: INodeDB | null;
  breadcrumbs?: BreadcrumbItem[];
}
export interface Command {
  execute: () => void;
  undo: () => void;
}
