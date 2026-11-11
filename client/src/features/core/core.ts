import { Store, EVENTS } from "./store";
import { NodeRenderer } from "@/features/nodes/nodeRenderer";
import { Desk } from "@features/desk/desk";
import { getToken } from "@services/auth.service";
import { ServerPersistence } from "./serverPersistence";
import { NodeManager } from "@features/nodes/NodeManager";
import { initCommands, resetCommands } from "./comands";
import { History } from "@features/core/history";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { Clipboard } from "@features/core/Clipboard";
import { CPopupSort } from "@/components/c-popup-sort/c-popup-sort";
import { breadcrumbsService } from "@/features/breadcrumbs/breadcrumbsService";
import Tools from "./Tools";
import { reInitAllNodes } from "../nodes/nodeLifecycle";
import { createModeStore, type ReactiveModeStore } from "./modeStore";
import { ViewportCuller } from "../desk/viewportCuller";

export { EVENTS };
export class Core {
  store!: Store;
  nodeManager!: NodeManager;
  nodeRenderer!: NodeRenderer;
  selectManager!: SelectManager;
  desk!: Desk;
  viewportCuller!: ViewportCuller;
  // localPersistence: LocalPersistence;
  serverPersistence!: ServerPersistence;
  history!: History;
  clipboard!: Clipboard;
  popupSort: CPopupSort = new CPopupSort();
  private unsubscribers: (() => void)[] = [];
  private abortController = new AbortController();

  mode: ReactiveModeStore;

  constructor() {
    this.history = new History();
    this.clipboard = new Clipboard();

    this.mode = createModeStore(
      {
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
        isPinching: false,
        lastPinchEndTime: 0,
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
        isShiftDrag: false,
      },
      (key, value) => {
        this.store?.emit(EVENTS.mode.changed, { key, value });
      },
    );

    const updateModifiers = (e: MouseEvent | KeyboardEvent) => {
      this.mode.mouseStatus.shift = e.shiftKey;
      this.mode.mouseStatus.ctrl = e.ctrlKey;
      this.mode.mouseStatus.alt = e.altKey;
    };
    window.addEventListener(
      "pointerdown",
      updateModifiers,
      { capture: true, signal: this.abortController.signal },
    );
    window.addEventListener(
      "pointerup",
      updateModifiers,
      { capture: true, signal: this.abortController.signal },
    );
    window.addEventListener(
      "pointermove",
      updateModifiers,
      { capture: true, signal: this.abortController.signal },
    );
    window.addEventListener(
      "keydown",
      updateModifiers,
      { capture: true, signal: this.abortController.signal },
    );
    window.addEventListener(
      "keyup",
      updateModifiers,
      { capture: true, signal: this.abortController.signal },
    );
  }

  async init(_params: Record<string, string>) {
    const currentPath = window.location.pathname;
    const deskId = currentPath.split("/").pop() || "root";
    this.mode.deskId = deskId;

    this.store = new Store();

    this.unsubscribers.push(
      this.store.on(EVENTS.NodeManager.reInitAlnodes, () => {
        reInitAllNodes(this.nodeManager);
      }),
      core.store.on(EVENTS.server.loaded, (snapshot) => {
        this.nodeManager.loadSnapshot(snapshot);
        if (snapshot.breadcrumbs) {
          breadcrumbsService.setItems(snapshot.breadcrumbs);
        } else if (this.mode.deskId === "root") {
          breadcrumbsService.clear();
        }
      }),
      core.store.on(EVENTS.node.updated, (node) => {
        if (node && node._id && node._id === this.mode.deskId) {
          breadcrumbsService.updateItemTitle(node._id, node.title || "");
        }
      }),
    );

    this.desk = new Desk();
    this.nodeManager = new NodeManager();
    this.nodeRenderer = new NodeRenderer();
    this.viewportCuller = new ViewportCuller();
    this.unsubscribers.push(() => this.viewportCuller.destroy());
 

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("loader:show"));
    }

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
    if (typeof document !== "undefined" && "fonts" in document) {
      await document.fonts.ready;
    }
    await this.serverPersistence.init();
    initCommands();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("loader:hide"));
    }
  }
  unmount() {
    this.abortController.abort();
    resetCommands();
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
if (typeof window !== "undefined") {
  (window as any).core = core;
}
