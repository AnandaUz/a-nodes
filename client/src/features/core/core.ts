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
import { Clipboard } from "@features/core/Clipboard";

export { EVENTS };
export class Core {
  store!: Store;
  nodeManager!: NodeManager;
  nodeRenderer!: NodeRenderer;
  selectManager!: SelectManager;
  desk!: Desk;
  // localPersistence: LocalPersistence;
  serverPersistence!: ServerPersistence;
  history!: History;
  managerCore?: ManagerCore;
  clipboard!: Clipboard;

  mode = {
    textEditing: false,
    selectMoving: false,
    textNode: false,
    threads: false,
    threads_selected: false,
    selectedVNodeCount: 0,
    deskId: "root",
    wasMoving: false, //переменная для того чтобы клик не снимал выделения
    scale: 1,
  };

  constructor() {
    this.history = new History();
    this.nodeManager = new NodeManager();
    this.nodeRenderer = new NodeRenderer();
    this.clipboard = new Clipboard();
  }

  async init(_params: Record<string, string>) {
    const currentPath = window.location.pathname;
    const deskId = currentPath.split("/").pop() || "root";
    this.mode.deskId = deskId;

    this.store = new Store();

    this.desk = new Desk();

    const container = document.getElementById("main")!;

    const token = getToken() ?? undefined;

    this.desk.mount(container);
    this.nodeManager.init();
    this.nodeRenderer.init();
    this.selectManager = new SelectManager();

    this.serverPersistence = new ServerPersistence({
      apiUrl: "/api/nodes",
      deskId: deskId,
      token: token,
    });
    await this.serverPersistence.init();

    initCommands();
  }
  unmount() {
    this.history.clear();
    this.store.clear();
    this.nodeManager.unmount();
    this.nodeRenderer.unmount();
    this.desk.unmount();
    if (this.selectManager) {
      this.selectManager.unmount();
    }
  }
}

export const core = new Core();
