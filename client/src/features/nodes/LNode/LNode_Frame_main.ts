import { core } from "@/features/core/core";
import VFrame from "../VFrame/VFrame";
import type { VNode } from "../VNode";
import { LNode } from "./LNode";
import { NODE_TYPES } from "../node-registry";

export class LNode_Frame_main extends LNode {
  getVNodeType(): typeof VNode {
    return VFrame;
  }
  constructor() {
    super();
    this.forCompatibility();
  }
  /**для совместимости с теми фреймамаи когда ещё не было списков
   * иследую область означенную высотой и все ноды добавляю во фрейм */
  forCompatibility() {
    // прорабатывает если
    // не задан локал аиди - это обязательно для любого родителя
    if (this.lID) return;
    console.log("forCompatibility ", this.title);
    this.lID = core.nodeManager.getMaxLID() + 1;
    this.type = NODE_TYPES.FRAME.main;
    const hh = this.exData?.hh || 10000;

    const vNode = this.vNode as VFrame;
    if (!vNode) return;

    const frameRect = { ...vNode.bodyRect };
    frameRect.height = hh;

    const nodes = core.selectManager.getNodeOverRect(frameRect);
    const list = this.list;
    if (!list.children) list.children = new Set();
    nodes.forEach((node) => {
      if (node === this) return;
      list.children?.add(node);
      node.list.parentNode = this;
    });
    this.list.checkTree();
    this.list.setPositionForChildren();

    this.save();
  }
}
