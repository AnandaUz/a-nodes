import { EventEmitter } from "@base/client/features/event-emitter";

import type { INode } from "@shared/types";
import type { DeskSnapshot } from "./interfaces";
import type { VNode } from "../nodes/VNode";

export const EVENTS = {
  page: {
    loaded: "page:loaded",
  },
  renderer: {
    refreshAll: "renderer:refreshAll",
  },
  nodes: {
    created: "node:created",
    updated: "node:updated",
    moved: "node:moved",
    moving: "node:moving",
    deleted: "node:deleted",
    mouse: {
      down: "mouse:down",
      move: "mouse:move",
      up: "mouse:up",
    },
  },
  server: {
    updated: "server:updated",
    loaded: "server:loaded",
    error: "server:error",
  },
} as const;

export type DeskEvents = {
  [EVENTS.nodes.created]: INode;
  [EVENTS.nodes.updated]: INode;
  [EVENTS.nodes.moved]: INode;
  [EVENTS.nodes.moving]: INode;
  [EVENTS.nodes.deleted]: INode;
  [EVENTS.server.loaded]: DeskSnapshot;
  [EVENTS.server.updated]: DeskSnapshot;
  [EVENTS.server.error]: Error;
  [EVENTS.renderer.refreshAll]: void;
  [EVENTS.nodes.mouse.down]: VNode;
  [EVENTS.nodes.mouse.move]: VNode;
  [EVENTS.nodes.mouse.up]: VNode;
};

export class Store extends EventEmitter<DeskEvents> {
  // private nodes: Map<string, INode> = new Map();
  // Возвращает полное состояние стола — для сохранения
  // getSnapshot(): DeskSnapshot {
  //   return {
  //     nodes: this.getAllNodes(),
  //   };
  // }
  // Загружает состояние и эмитит события — рендер обновится сам
  // loadSnapshot(snapshot: DeskSnapshot): void {
  //   // this.nodes.clear();
  //   // this.connectors.clear();
  //   for (const data of snapshot.nodes as INode[]) {
  //     if (this.nodes.has(data._id)) {
  //       const exNode = this.nodes.get(data._id)!;
  //       if (
  //         data.lastUpdate &&
  //         exNode.lastUpdate &&
  //         exNode.lastUpdate < data.lastUpdate
  //       ) {
  //         this.updateNode(data._id, data);
  //         continue;
  //       }
  //     } else {
  //       const node: INode = {
  //         _id: data._id || generateId(),
  //         x: data.x ?? 0,
  //         y: data.y ?? 0,
  //         lastUpdate: data.lastUpdate ?? new Date(),
  //       };
  //       this.nodes.set(node._id, node);
  //       this.emit(NODE_EVENTS.Created, { ...node });
  //     }
  //   }
  // }
}
export const store = new Store();
