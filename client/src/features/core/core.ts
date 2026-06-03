import { Store, EVENTS } from "./store";
import { NodeRenderer } from "@features/nodes/node-renderer";

import { Desk } from "@features/desk/desk";
import { getToken } from "@services/auth.service";
// import { LocalPersistence } from "./local-persistence";
import { ServerPersistence } from "./server-persistence";
import { NodeManager } from "@features/nodes/NodeManager";
import { initCommands } from "./comands";
import { History } from "@features/core/history";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import type { ManagerCore } from "../nodes/VManager/ManagerCore";

export { EVENTS };
export class Core {
  store: Store;
  nodeManager: NodeManager;
  nodeRenderer: NodeRenderer;
  selectManager: SelectManager;
  desk: Desk;
  // localPersistence: LocalPersistence;
  serverPersistence: ServerPersistence = null!;
  history: History;
  managerCore?: ManagerCore;

  mode = {
    textEditing: false,
    selectMoving: false,
    textNode: false,
    threads: false,
    threads_selected: false,
    selectedVNodeCount: 0,
  };

  constructor() {
    this.history = new History();
    this.store = new Store();
    this.nodeManager = new NodeManager();
    this.desk = new Desk();

    this.nodeRenderer = new NodeRenderer();
    this.selectManager = new SelectManager();

    // this.renderer = new NodeRenderer();
    // this.desk = new Desk();
    // // this.localPersistence = new LocalPersistence();
    // this.serverPersistence = new ServerPersistence();
  }

  async init(params: Record<string, string>) {
    const container = document.getElementById("main")!;
    const deskId = params["id"] ?? "root";

    const token = getToken() ?? undefined;

    this.desk.mount(container);
    this.nodeManager.init();
    this.nodeRenderer.init();

    // const nodeRender = new NodeRenderer();

    // Core.renderer.bindStore();

    // this.localPersistence = new LocalPersistence(store, deskId);
    // this.localPersistence.init();
    this.serverPersistence = new ServerPersistence({
      apiUrl: "/api/nodes",
      deskId: deskId,
      token: token,
    });
    await this.serverPersistence.init();

    initCommands();
  }
}

export const core = new Core();
