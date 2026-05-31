import type { INode } from "@shared/types";
// import { VNode } from "@features/nodes/VNode";
// import { core, EVENTS } from "@features/core/core";
import VTextEdit from "../VTextEdit";
import "./VManager.scss";
import { core } from "@/features/core/core";
// import { EVENTS } from "@/features/core/store";
// import type { VNode } from "../VNode";
// import { NODE_TYPES } from "../node-registry";
import { ManagerCore } from "./ManagerCore";
import { Helper } from "./Helper";
import type { VNode } from "../VNode";

export default class VM_area extends VTextEdit {
  helpers = new Map<string, Helper>();
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-m-area");

    if (!core.managerCore) core.managerCore = new ManagerCore();
  }
  initMovingElement() {
    this.movingElement = this.body.querySelector(".top-block") as HTMLElement;
  }

  bodyInit() {
    this.body.innerHTML += `
      <div class="top-block">
        <div class="elTitle"></div>
        <div class="menu-block">          
        </div>
      </div>
  `;
  }

  // render() {
  //   super.render();
  // }
  refreshHelpers() {
    core.nodeRenderer.elements?.forEach((vnode) => {
      if (vnode instanceof VTextEdit && vnode !== this) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        if (this.checkPointOver(x, y)) {
          if (vnode instanceof VTextEdit) {
            let h = this.helpers.get(vnode._id);
            if (!h) {
              h = this.addHelper(vnode);
            }

            // h!.style.transform = `translate(${x}px, ${y}px)`;
          }
        }
      }
    });
  }
  addHelper(vnode: VNode) {
    const helper = new Helper(vnode, this);
    this.helpers.set(vnode._id, helper);
    return helper;
  }
}
