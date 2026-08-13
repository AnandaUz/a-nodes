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
import { FrameCore } from "../nodes/VFrame/FrameCore";
import { Clipboard } from "@features/core/Clipboard";
import { CPopupSort } from "@/components/c-popup-sort/c-popup-sort";
import Tools from "./Tools";
import { app } from "@/app";
import VFrame from "../nodes/VFrame/VFrame";

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
  frameCore: FrameCore = new FrameCore();
  clipboard!: Clipboard;
  popupSort: CPopupSort = new CPopupSort();
  private unsubscribers: (() => void)[] = [];

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
    inputMode: Tools.getInputMode(),
    mobile_mode: {
      navigation: false,
      adding: false,
      select: false,
    },
  };

  constructor() {
    this.history = new History();
    this.nodeManager = new NodeManager();
    this.nodeRenderer = new NodeRenderer();
    this.clipboard = new Clipboard();

    initCommands();
  }

  async init(_params: Record<string, string>) {
    const currentPath = window.location.pathname;
    const deskId = currentPath.split("/").pop() || "root";
    this.mode.deskId = deskId;

    this.store = new Store();

    this.unsubscribers.push(
      this.store.on(EVENTS.NodeManager.reInitAllNodes, () => {
        console.time("Перерендер всех нод страницы");
        core.desk.disconnectNodesEl();
        core.nodeRenderer.renderAll();
        core.desk.connectNodesEl();
        core.nodeRenderer.getAllNodes().forEach((node) => {
          node.refreshBodyRect();

          if (node instanceof VFrame) {
            this.frameCore.addFrame(node);
          }
        });
        core.desk.disconnectNodesEl();
        core.frameCore.initHelpers();
        core.desk.connectNodesEl();

        console.timeEnd("Перерендер всех нод страницы");
      }),
    );

    this.desk = new Desk();

    app.showLoader();

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

    app.hideLoader();
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
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}

export const core = new Core();
