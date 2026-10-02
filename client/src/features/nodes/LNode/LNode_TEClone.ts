import type { VNode } from "../VNode";
import { LNode_TextEdit } from "./LNode_TextEdit";
import VTextEditClone from "../VTextEditClone";

export class LNode_TEClone extends LNode_TextEdit {
  /** нода оригинал */
  sourceNode: LNode_TextEdit | undefined;
  /** нода родитель */
  mainNode: LNode_TextEdit | undefined;

  init(): void {
    super.init();

    this.forCompatibility();

    //     this.sourceVNode = core.nodeRenderer.getVNode(sourceNodeId) as VTextEdit;
    //     this.sourceVNode.subNodes.set(this.node._id || "", this);
    //     this.unsubscribers.push(
    //       core.store.on(EVENTS.node.updated, (node) => {
    //         if (node._id === this.sourceVNode?.node._id) {
    //           this.title = node.title;
    //         }
    //       }),
    //     );
  }
  /** возращает ноду оригинал */
  getSourceNode(): LNode_TextEdit {
    // если sourceNode уже задан — возвращаем его
    if (this.sourceNode) return this.sourceNode;
    // иначе поднимаемся по цепочке mainNode пока не найдём оригинал
    let sNode: LNode_TextEdit = this;
    let safety = 50;
    while (sNode instanceof LNode_TEClone && sNode.sourceNode && safety-- > 0) {
      sNode = sNode.sourceNode;
    }
    return sNode;
  }
  /** для совместимости */
  forCompatibility() {
    const sourceNodeId = this.exData?.ownerNodesIds?.[0];
    if (!sourceNodeId) return;
  }
  getVNodeType(): typeof VNode {
    return VTextEditClone;
  }
}
