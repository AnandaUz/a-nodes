import type { INode } from "@shared/types";

import VM_area from "./VM_area";
import { core, EVENTS } from "@/features/core/core";
import Helper_sub from "./Helper/Helper_sub";
import { NODE_TYPES } from "../node-registry";
// import VTextEdit from "../VTextEdit";

export default class VM_area_sub extends VM_area {
  areasMain = new Map<string, VM_area>();
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-m-sub");
    this.helperType = Helper_sub;

    core.managerCore?.areas.subs.set(node._id!, this);

    core.store.on(EVENTS.renderer.refreshAllVNodes, () => {
      this.onAllRendered();
    });

    core.store.on(
      EVENTS.helper.main.btnConnection,
      ({ helperMain, areaSub }) => {
        if (this !== areaSub) return;
        this.addNodeClone(helperMain.nodeMain.nodeEss);
      },
    );
    core.store.on(EVENTS.nodes.deleted, (nodeEss) => {
      const h = this.helpers.get(nodeEss._id || "");
      if (h) {
        h.remove();
      }
    });
  }
  // init() {
  //   super.init();
  // }
  onAllRendered() {
    const ids = this.nodeEss.exData?.ownerNodesIds;
    if (!ids || ids.length === 0) return;

    this.movingElement.style.backgroundColor = `hsl(${this.nodeEss.exData?.color || 0},60%,70%)`;

    ids.forEach((id) => {
      const areaMain = core.managerCore?.areas.main.get(id);
      if (!areaMain) return;
      this.areasMain.set(id, areaMain);
      this.elSubTitle!.innerHTML = areaMain.nodeEss.title || "";

      core.store.emit(EVENTS.area.sub.connected, { areaSub: this, areaMain });
    });
  }
  async addNodeClone(nodeEss: INode) {
    const x = this.x + 20;
    const y = this.y + 30;
    const newNodeEss: INode = {
      x,
      y,
      type: NODE_TYPES.TEXT_EDIT_CLONE.id,
      exData: {
        ownerNodesIds: [nodeEss._id || ""],
      },
    };
    await core.nodeManager.createNode(newNodeEss);

    this.initHelpers();
  }

  // bodyInit() {
  //   super.bodyInit();
  //   this.body.innerHTML += ``;
  // }
  // render() {
  //   super.render();
  // }
}
