import type { INode } from "@shared/types";
import VTextEdit from "../VTextEdit";
import "./VManager.scss";
import { core, EVENTS } from "@/features/core/core";
import { ManagerCore } from "./ManagerCore";
import { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";

export default class VM_area extends VTextEdit {
  helpers = new Map<string, Helper>();
  elSubTitle?: HTMLElement;
  elBtnsBlock?: HTMLElement;
  helperType = Helper;
  // events = new EventEmitter<VNodeEvents>();
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-m-area");

    if (!core.managerCore) core.managerCore = new ManagerCore();

    core.store.on(EVENTS.renderer.refreshAllVNodes, () => {
      this.initHelpers();
    });
  }
  // init() {
  //   super.init();
  // }
  initMovingElement() {
    this.movingElement = this.body.querySelector(".top-block") as HTMLElement;
  }

  bodyInit() {
    this.body.innerHTML += `
      <div class="top-block">
        <div class="title-el"></div>               
      </div>
      <div class="menu-block">
        <div class="sub-title"></div>
        <div class="btns-block"></div>
      </div>`;
    this.elSubTitle = this.body.querySelector(".sub-title") as HTMLElement;
    this.elBtnsBlock = this.body.querySelector(".btns-block") as HTMLElement;
  }

  // render() {
  //   super.render();
  // }
  initHelpers() {
    core.nodeRenderer.getAllNodes().forEach((vnode) => {
      if (vnode instanceof VTextEdit && vnode !== this) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        if (this.checkPointOver(x, y)) {
          if (vnode instanceof VTextEdit) {
            let h = this.helpers.get(vnode._id);
            if (!h) {
              h = this.addHelper(vnode);
            } else {
              h.render();
            }

            // h!.style.transform = `translate(${x}px, ${y}px)`;
          }
        }
      }
    });
  }
  addHelper(vnode: VNode) {
    const helper = new this.helperType(vnode, this);
    this.helpers.set(vnode._id, helper);
    return helper;
  }
}
