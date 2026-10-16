import { Store, EVENTS } from "./store";
import { NodeRenderer } from "@/features/nodes/nodeRenderer";
import { Desk } from "@features/desk/desk";
import { getToken } from "@services/auth.service";
import { ServerPersistence } from "./serverPersistence";
import { NodeManager } from "@features/nodes/NodeManager";
import { initCommands } from "./comands";
import { History } from "@features/core/history";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { Clipboard } from "@features/core/Clipboard";
import { CPopupSort } from "@/components/c-popup-sort/c-popup-sort";
import Tools from "./Tools";
import { app } from "@/app";
import { LNode_TextEdit } from "../nodes/LNode/LNode_TextEdit";

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
    mouseStatus: {
      shift: false,
      ctrl: false,
      alt: false,
    },
  };

  constructor() {
    this.history = new History();

    this.clipboard = new Clipboard();

    initCommands();
    window.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        this.mode.mouseStatus.shift = e.shiftKey;
        this.mode.mouseStatus.ctrl = e.ctrlKey;
        this.mode.mouseStatus.alt = e.altKey;
      },
      true,
    );
    window.addEventListener(
      "pointerup",
      (e: PointerEvent) => {
        this.mode.mouseStatus.shift = e.shiftKey;
        this.mode.mouseStatus.ctrl = e.ctrlKey;
        this.mode.mouseStatus.alt = e.altKey;
      },
      true,
    );
  }

  async init(_params: Record<string, string>) {
    const currentPath = window.location.pathname;
    const deskId = currentPath.split("/").pop() || "root";
    this.mode.deskId = deskId;

    this.store = new Store();

    this.unsubscribers.push(
      this.store.on(EVENTS.NodeManager.reInitAlnodes, () => {
        console.time("Перерендер всех нод страницы");
        core.desk.disconnectNodesEl(); //>
        core.nodeRenderer.renderAll();
        core.desk.connectNodesEl(); //<

        const checkLID = new Set<number>();
        core.nodeManager.nodes.forEach((node) => {
          /** проеверка на дублировани lID */
          if (!node.lID) return;
          if (!checkLID.has(node.lID)) {
            checkLID.add(node.lID);
          } else {
            console.log("дубль LID", node.title);
            node.lID = this.nodeManager.getMaxLID() + 1;
            node.save();
          }
        });
        // включаем индикаторы репитов
        core.nodeManager.nodes.forEach((node) => {
          node.repeatMode.refreshIndicator();
        });

        core.nodeManager.nodes.forEach((node) => {
          node.vNode?.refreshBodyRect();

          // if (node instanceof VFrame) {
          //   // собираем все фреймы в ядко фреймов
          //   this.frameCore.addFrame(node);
          // }
        });

        const frames = [...core.nodeManager.nodes.values()].filter(
          (node) => node instanceof LNode_TextEdit && node.frame.isFrame,
        ) as LNode_TextEdit[];

        /** подключаем детей к родителям */
        frames.forEach((node) => {
          node.frame.init();
        });
        frames.forEach((node) => {
          node.frame.initBtns();
        });
        frames.forEach((node) => {
          node.frame.setBtnsState();
        });

        this.nodeManager.setPositionForAllLinkedChildNodes();
        core.nodeManager.nodes.forEach((node) => {
          node.vNode?.renderSVG();
          if (node instanceof LNode_TextEdit) {
          }
        });

        // core.desk.disconnectNodesEl(); //>
        // core.frameCore.refresh(); //пересчитывает все

        // core.desk.connectNodesEl(); //

        console.timeEnd("Перерендер всех нод страницы");
      }),
      core.store.on(EVENTS.server.loaded, (snapshot) => {
        this.nodeManager.loadSnapshot(snapshot);
      }),
    );

    this.desk = new Desk();
    this.nodeManager = new NodeManager();
    this.nodeRenderer = new NodeRenderer();
 

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
    this.serverPersistence.unmount();
    this.desk.unmount();
    if (this.selectManager) {
      this.selectManager.unmount();
    }
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}

export const core = new Core();
