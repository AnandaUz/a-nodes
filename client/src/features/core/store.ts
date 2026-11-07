import { EventEmitter } from "@base/client/features/event-emitter";
import type { DeskSnapshot } from "./interfaces";
import type { VNode } from "@features/nodes/VNode/VNode";
import type { LNode } from "@/features/nodes/LNode/LNode";

export const EVENTS = {
  loader: {
    show: "loader:show",
    hide: "loader:hide",
  },
  mode: {
    changed: "mode:changed",
  },
  renderer: {
    refreshAllVNodes: "renderer:refreshAll", //срабатывает когда все ноды иницированы и отрендерены
  },
  NodeManager: {
    reInitAlnodes: "nodeManager:reInitAlnodes",
  },
  node: {
    created: "node:created",
    updated: "node:updated",
    moved: "node:moved",
    moving: "node:moving",
    deleted: "node:deleted",
    selected: "node:selected",
    unselected: "node:unselected",
    inTrash: "node:inTrash",
    ok: "node:ok",
    selectedMoved: "nodes:selectedMoved",
  },
  vNode: {
    pointer: {
      down: "pointer:down",
      move: "pointer:move",
      up: "pointer:up",
    },
  },
  server: {
    updated: "server:updated",
    loaded: "server:loaded",
    error: "server:error",
  },
} as const;

type EventValues<T> = T extends string
  ? T
  : { [K in keyof T]: EventValues<T[K]> }[keyof T];

export type EventName = EventValues<typeof EVENTS>;

type AssertExactEvents<
  T extends Record<EventName, unknown> &
    Record<Exclude<keyof T, EventName>, never>,
> = T;

export type DeskEvents = AssertExactEvents<{
  [EVENTS.NodeManager.reInitAlnodes]: void;
  [EVENTS.node.created]: LNode;
  [EVENTS.node.updated]: LNode;
  [EVENTS.node.moved]: LNode;
  [EVENTS.node.moving]: LNode;
  [EVENTS.node.deleted]: LNode;
  [EVENTS.node.selected]: LNode | null;
  [EVENTS.node.unselected]: LNode | null;
  [EVENTS.node.inTrash]: LNode;
  [EVENTS.node.ok]: LNode;
  [EVENTS.server.loaded]: DeskSnapshot;
  [EVENTS.server.updated]: DeskSnapshot;
  [EVENTS.server.error]: Error;
  [EVENTS.node.selectedMoved]: LNode[];
  [EVENTS.renderer.refreshAllVNodes]: void;
  [EVENTS.vNode.pointer.down]: VNode;
  [EVENTS.vNode.pointer.move]: VNode;
  [EVENTS.vNode.pointer.up]: VNode;
  [EVENTS.loader.show]: void;
  [EVENTS.loader.hide]: void;
  [EVENTS.mode.changed]: { key: string; value: unknown };
}>;

export class Store extends EventEmitter<DeskEvents> {}
export const store = new Store();
