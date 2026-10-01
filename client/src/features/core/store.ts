import { EventEmitter } from "@base/client/features/event-emitter";
import type { DeskSnapshot } from "./interfaces";
import type { VNode } from "../nodes/VNode";

// import type { INode } from "@shared/types";
import type Helper_main from "../nodes/VFrame/Helper/Helper_main";
import type Helper_sub from "../nodes/VFrame/Helper/Helper_sub";
import type VM_frame from "../nodes/VFrame/VFrame";
import type { LNode } from "@shared/types/LNode";

export const EVENTS = {
  page: {
    loaded: "page:loaded",
  },
  renderer: {
    refreshAllVNodes: "renderer:refreshAll", //срабатывает когда все ноды иницированы и отрендерены
  },
  NodeManager: {
    reInitAllNodes: "nodeManager:reInitAllNodes",
  },
  lNode: {
    created: "node:created",
    updated: "node:updated",
    moved: "node:moved",
    moving: "node:moving",
    // movingById: "node:moving:${string}",
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
  frame: {
    sub: {
      created: "frame:sub:created",
      deleted: "frame:sub:deleted",
      connected: "frame:sub:connected",
      disconnected: "frame:sub:disconnected",
      addNodeClone: "frame:sub:addNodeClone",
    },
  },
  helper: {
    main: {
      btnConnection: "helper:main:btnConnection",
    },
    sub: {
      btnOk: "helper:sub:btnOk",
    },
  },
} as const;

export type DeskEvents = {
  [EVENTS.NodeManager.reInitAllNodes]: void;
  [EVENTS.lNode.created]: LNode;
  [EVENTS.lNode.updated]: LNode;
  [EVENTS.lNode.moved]: LNode;
  [EVENTS.lNode.moving]: LNode;
  [EVENTS.lNode.deleted]: LNode;
  [EVENTS.lNode.selected]: LNode | null;
  [EVENTS.lNode.unselected]: LNode | null;
  [EVENTS.lNode.inTrash]: LNode;
  [EVENTS.lNode.ok]: LNode;
  [EVENTS.server.loaded]: DeskSnapshot;
  [EVENTS.server.updated]: DeskSnapshot;
  [EVENTS.server.error]: Error;
  [EVENTS.lNode.selectedMoved]: VNode[];
  [EVENTS.renderer.refreshAllVNodes]: void;
  [EVENTS.vNode.pointer.down]: VNode;
  [EVENTS.vNode.pointer.move]: VNode;
  [EVENTS.vNode.pointer.up]: VNode;
  [EVENTS.frame.sub.created]: VM_frame;
  [EVENTS.frame.sub.deleted]: VM_frame;
  [EVENTS.frame.sub.connected]: {
    subFrame: VM_frame;
    mainFrame: VM_frame;
  };
  [EVENTS.frame.sub.disconnected]: {
    subFrame: VM_frame;
    mainFrame: VM_frame;
  };
  [EVENTS.frame.sub.addNodeClone]: { lNode: LNode; subFrame: VM_frame };
  [EVENTS.helper.main.btnConnection]: {
    mainHelper: Helper_main;
    subFrame: VM_frame;
  };
  [EVENTS.helper.sub.btnOk]: {
    helperSub: Helper_sub;
    // subFrame: VM_frame;
  };
};

export class Store extends EventEmitter<DeskEvents> {}
export const store = new Store();
