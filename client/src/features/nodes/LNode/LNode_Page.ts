import { VPage } from "@/features/nodes/VNode/VPage";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";

export class LNode_Page extends LNode_TextEdit {
  getVNodeType() {
    return VPage;
  }

  checkOutNodesMode() {
    const hasChildren = Boolean(this.list?.children && this.list.children.size > 0);
    if (hasChildren) {
      if (!this.frame.isFrame || !(this.vNode as any)?.isFrameMode) {
        this.frame.turnOn_frameMode();
      }
      this.list.setPositionForChildren();
      this.vNode?.renderSVG();
    } else {
      if (this.frame.isFrame || (this.vNode as any)?.isFrameMode) {
        this.frame.turnOff_frameMode();
        this.vNode?.renderSVG();
      }
    }
  }
}
