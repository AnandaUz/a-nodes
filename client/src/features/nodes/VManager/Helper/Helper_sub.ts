import { Helper } from "./Helper";
import type VM_area_sub from "../VM_area_sub";
import type { VNode } from "../../VNode";
import { core, EVENTS } from "@/features/core/core";

export default class Helper_sub extends Helper {
  constructor(vnode: VNode, areaMain: VM_area_sub) {
    super(vnode, areaMain);
    this.body.classList.add("helper-sub");
  }

  render() {
    super.render();
    this.elBtBlock.innerHTML = "";

    const bt = document.createElement("div");
    bt.className = "bt ico ico-ok";
    this.elBtBlock.appendChild(bt);

    bt.addEventListener("click", async () => {
      core.store.emit(EVENTS.helper.sub.btnOk, { helperSub: this });

      // const mainNode = this.nodeMain;
      // mainNode.nodeEss.ok = true;
      // mainNode.save();

      core.nodeManager.okNode(this.nodeMain.nodeEss._id || "");
    });
  }
}
