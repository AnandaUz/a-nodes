import type { INode } from "@shared/types";
import { NODE_TYPES } from "../node-registry";
import { core } from "@/features/core/core";
import VM_area from "./VM_area";
import type { VNode } from "../VNode";
import Tools from "@/features/core/Tools";

export class Helper {
  body: HTMLDivElement;
  ownerNode: VNode;
  area: VM_area;
  constructor(vnode: VNode, area: VM_area) {
    this.body = document.createElement("div");
    this.ownerNode = vnode;
    this.area = area;

    this.body.className = "vnode-helper";
    core.desk.nodesEl.appendChild(this.body);

    const bt = document.createElement("div");
    bt.className = "bt";
    this.body.appendChild(bt);
    bt.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
    });
    bt.addEventListener("pointerup", async (e) => {
      Tools.stopEvent(e);

      const pArea = core.managerCore!.areas.subs?.values().next().value;
      if (!pArea) return;
      const x = pArea.x + 20;
      const y = pArea.y + 30;

      const newNodeEss: INode = {
        x,
        y,
        type: NODE_TYPES.TEXT_EDIT_CLONE.id,
        exData: {
          ownerNodeId: vnode._id || undefined,
        },
      };
      await core.nodeManager.createNode(newNodeEss);

      // const vnode = core.nodeRenderer.elements.get(
      //   nodeEss!._id as string,
      // ) as VTextEdit;
      // vnode?.startEditing();
    });
    this.render();
  }
  render() {
    const x = this.ownerNode.x;
    const y = this.ownerNode.y;
    this.body.style.transform = `translate(${x}px, ${y}px)`;
  }
}
