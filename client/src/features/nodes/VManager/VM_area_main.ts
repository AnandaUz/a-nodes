import type { INode } from "@shared/types";

import VM_area from "./VM_area";
import { core, EVENTS } from "@/features/core/core";
import VTextEdit from "../VTextEdit";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
// import type { VNode } from "../VNode";
// import { Helper } from "./Helper";

export default class VM_area_main extends VM_area {
  subAreas = new Map<string, VM_area>();

  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    core.managerCore!.areas.main.set(node._id!, this);

    core.store.on(EVENTS.renderer.refreshAll, () => {
      this.refreshHelpers();
    });

    // core.store.on(EVENTS.nodes.moving, (vnode) => {
    //   const h = this.helpers.get(vnode._id || "");
    //   if (h) {
    //     h.render();
    //   }
    // });

    core.store.on(EVENTS.nodes.moved, (vnode) => {
      if (!vnode) return;
      const { x, y } = vnode;
      if (x === undefined || y === undefined) return;

      if (this.checkPointOver(x, y)) {
        if (vnode instanceof VTextEdit) {
          if (!this.helpers.has(vnode._id)) {
            this.addHelper(vnode);
          }
        }
      }
    });
    const menuBlock = this.body.querySelector(".menu-block") as HTMLElement;
    const btnAddArea = document.createElement("div");
    btnAddArea.className = "btn ico ico-plus";
    btnAddArea.title = "Add Area";
    menuBlock.appendChild(btnAddArea);

    btnAddArea.onclick = (e) => {
      Tools.stopEvent(e);
      this.addArea();
    };
  }

  addArea() {
    console.log("addArea");

    const bounds = this.body.getBoundingClientRect();
    const newNode: INode = {
      ownerId: this.nodeEss._id || "",
      type: NODE_TYPES.MANAGER.area_sub,
      x: bounds.left + this.x + bounds.width + 10,
      y: bounds.top + this.y + bounds.height + 10,
      title: "Сортировщик",
    };
    const vNode = core.nodeManager.createNode(newNode);
    // if (vNode instanceof VM_area) {
    //   vNode.render();
    // }
  }
  refreshHConnectors() {}
}
