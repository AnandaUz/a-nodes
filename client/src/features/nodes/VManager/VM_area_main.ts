import type { INode } from "@shared/types";

import VM_area, { AREA_PADDING } from "./VM_area";
import { core, EVENTS } from "@/features/core/core";
// import VTextEdit from "../VTextEdit";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
// import { GRID } from "@/features/core/CONST";
// import type { VNode } from "../VNode";
// import { Helper } from "./Helper";

export default class VM_area_main extends VM_area {
  areasMain = new Map<string, VM_area>();

  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    this.helperType = Helper_main as any;

    core.managerCore!.areas.main.set(node._id!, this);

    this.unsubscribers.push(
      core.store.on(EVENTS.area.sub.connected, ({ subArea, mainArea }) => {
        if (mainArea !== this) return;
        this.areasMain.set(subArea.nodeEss._id || "", subArea);
      }),
      core.store.on(EVENTS.area.sub.disconnected, ({ subArea, mainArea }) => {
        if (mainArea !== this) return;
        this.areasMain.delete(subArea.nodeEss._id || "");
      }),
      core.store.on(EVENTS.area.sub.addNodeClone, (payload) => {
        const { subArea } = payload;
        if (!this.subAreas.has(subArea.nodeEss._id || "")) return;

        this.refreshHelpers();
      }),
    );
    const mainAreas = this.nodeEss.exData?.ownerNodesIds;
    if (mainAreas) {
      this.unsubscribers.push(
        core.store.on(EVENTS.renderer.refreshAllVNodes, () => {
          mainAreas.forEach((id) => {
            const mainArea = core.nodeRenderer.getVNode(id);
            if (mainArea instanceof VM_area) {
              core.store.emit(EVENTS.area.sub.connected, {
                mainArea,
                subArea: this,
              });
            }
          });
        }),
      );
    }
  }
  init(): void {
    super.init();
    const btnAddArea = document.createElement("div");
    btnAddArea.className = "btn ico ico-plus";
    btnAddArea.title = "Add Area";
    this.elBtnsBlock?.appendChild(btnAddArea);

    btnAddArea.onclick = (e) => {
      Tools.stopEvent(e);
      this.addArea();
    };
  }
  addArea() {
    const bounds = this.bodyRect;
    const newNode: INode = {
      exData: {
        ownerNodesIds: [this.nodeEss._id || ""],
        bgColor: Math.round(Math.random() * 360).toString(),
      },
      type: NODE_TYPES.MANAGER.area_main,
      x: Math.round(this.x + bounds.width + 20),
      y: Math.round(this.y),
      title: "Сортировщик",
    };
    core.nodeManager.createNode(newNode);
    // if (vNode instanceof VM_area) {
    //   vNode.render();
    // }
  }
  async addTextEdinCloneNode(nodeEss: INode) {
    const x = this.x + AREA_PADDING.left;
    const y = this.y + AREA_PADDING.top;

    const cloneNodeEss = await core.nodeManager.create_TextEditCloneNode(
      nodeEss,
      x,
      y,
    );
    if (cloneNodeEss) {
      const cloneNode = core.nodeRenderer.getVNode(cloneNodeEss._id || "");

      if (cloneNode) {
        const rect = {
          x,
          y,
          width: cloneNode?.width,
          height: cloneNode?.height,
        } as DOMRect;
        core.nodeRenderer.pushdown_nodes_out_of_rect(rect, [cloneNode]);
        const helper = this.helpersById[cloneNodeEss._id || ""];
        // cloneNode.moveTo({ x: rect.x, y: rect.y });
        // this.refreshHelpers();

        core.store.emit(EVENTS.area.sub.addNodeClone, {
          nodeEss: cloneNodeEss,
          subArea: this,
        });
        return helper;
      }
    }
  }
}
