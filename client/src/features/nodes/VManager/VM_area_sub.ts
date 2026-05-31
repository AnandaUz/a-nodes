import type { INode } from "@shared/types";

import VM_area from "./VM_area";
import { core, EVENTS } from "@/features/core/core";
// import VTextEdit from "../VTextEdit";

export default class VM_area_sub extends VM_area {
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-m-sub");

    core.managerCore!.areas.subs.set(node._id!, this);

    core.store.on(EVENTS.renderer.refreshAll, () => {
      this.refreshHelpers();
    });

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
  // bodyInit() {
  //   super.bodyInit();
  //   this.body.innerHTML += ``;
  // }
  // render() {
  //   super.render();
  // }
}
