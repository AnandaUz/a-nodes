import { EventEmitter } from "@base/client/features/event-emitter";

// import type { INode } from "@shared/types";
import type { DeskSnapshot } from "./interfaces";
import type { VNode } from "../nodes/VNode";
import type VM_area_main from "../nodes/VManager/VM_area_main";
import type VM_area_sub from "../nodes/VManager/VM_area_sub";
import type { INode } from "@shared/types";
import type Helper_main from "../nodes/VManager/Helper/Helper_main";
import type Helper_sub from "../nodes/VManager/Helper/Helper_sub";

export const EVENTS = {
  page: {
    loaded: "page:loaded",
  },
  renderer: {
    refreshAllVNodes: "renderer:refreshAll",
  },
  NodeManager: {
    reInitAllNodes: "nodeManager:reInitAllNodes",
  },
  nodes: {
    created: "node:created",
    updated: "node:updated",
    moved: "node:moved",
    moving: "node:moving",
    // movingById: "node:moving:${string}",
    deleted: "node:deleted",
    selected: "node:selected",
    unselected: "node:unselected",
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
  area: {
    sub: {
      created: "area:sub:created",
      deleted: "area:sub:deleted",
      connected: "area:sub:connected",
      disconnected: "area:sub:disconnected",
      addNodeClone: "area:sub:addNodeClone",
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
  [EVENTS.nodes.created]: INode;
  [EVENTS.nodes.updated]: INode;
  [EVENTS.nodes.moved]: INode;
  [EVENTS.nodes.moving]: INode;
  [EVENTS.nodes.deleted]: INode;
  [EVENTS.nodes.selected]: INode;
  [EVENTS.nodes.unselected]: INode;
  [EVENTS.server.loaded]: DeskSnapshot;
  [EVENTS.server.updated]: DeskSnapshot;
  [EVENTS.server.error]: Error;
  [EVENTS.renderer.refreshAllVNodes]: void;
  [EVENTS.nodes.mouse.down]: VNode;
  [EVENTS.nodes.mouse.move]: VNode;
  [EVENTS.nodes.mouse.up]: VNode;
  [EVENTS.area.sub.created]: VM_area_sub;
  [EVENTS.area.sub.deleted]: VM_area_sub;
  [EVENTS.area.sub.connected]: {
    areaSub: VM_area_sub;
    areaMain: VM_area_main;
  };
  [EVENTS.area.sub.disconnected]: {
    areaSub: VM_area_sub;
    areaMain: VM_area_main;
  };
  [EVENTS.area.sub.addNodeClone]: { nodeEss: INode; areaSub: VM_area_sub };
  [EVENTS.helper.main.btnConnection]: {
    helperMain: Helper_main;
    areaSub: VM_area_sub;
  };
  [EVENTS.helper.sub.btnOk]: {
    helperSub: Helper_sub;
    // areaSub: VM_area_sub;
  };
};

export class Store extends EventEmitter<DeskEvents> {}
export const store = new Store();
