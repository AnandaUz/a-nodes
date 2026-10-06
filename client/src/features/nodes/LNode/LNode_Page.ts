import { VPage } from "@/features/nodes/VNode/VPage";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";

export class LNode_Page extends LNode_TextEdit {
  getVNodeType() {
    return VPage;
  }
}
