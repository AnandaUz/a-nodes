import type { INode } from "@shared/types";

import VM_area from "./VM_area";
import { core, EVENTS } from "@/features/core/core";
// import VTextEdit from "../VTextEdit";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
// import type { VNode } from "../VNode";
// import { Helper } from "./Helper";

export default class VM_area_main extends VM_area {
  areasMain = new Map<string, VM_area>();

  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    this.helperType = Helper_main;

    core.managerCore!.areas.main.set(node._id!, this);

    this.unsubscribers.push(
      core.store.on(EVENTS.area.sub.connected, ({ areaSub, areaMain }) => {
        if (areaMain !== this) return;
        this.areasMain.set(areaSub.nodeEss._id || "", areaSub);
      }),
      core.store.on(EVENTS.area.sub.disconnected, ({ areaSub, areaMain }) => {
        if (areaMain !== this) return;
        this.areasMain.delete(areaSub.nodeEss._id || "");
      }),
    );

    // core.store.on(EVENTS.nodes.moving, (vnode) => {
    //   const h = this.helpers.get(vnode._id || "");
    //   if (h) {
    //     h.render();
    //   }
    // });

    // core.store.on(EVENTS.nodes.moved, (vnode) => {
    //   if (!vnode) return;
    //   const { x, y } = vnode;
    //   if (x === undefined || y === undefined) return;

    //   if (this.checkPointOver(x, y)) {
    //     if (vnode instanceof VTextEdit) {
    //       if (!this.helpers.has(vnode._id)) {
    //         this.addHelper(vnode);
    //       }
    //     }
    //   }
    // });
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
    const bounds = this.body.getBoundingClientRect();
    const newNode: INode = {
      exData: {
        ownerNodesIds: [this.nodeEss._id || ""],
        color: Math.round(Math.random() * 360).toString(),
      },
      type: NODE_TYPES.MANAGER.area_sub,
      x: this.x + bounds.width + 20,
      y: this.y,
      title: "Сортировщик",
    };
    const vNode = core.nodeManager.createNode(newNode);
    // if (vNode instanceof VM_area) {
    //   vNode.render();
    // }
  }
  refreshHConnectors() {}
}
