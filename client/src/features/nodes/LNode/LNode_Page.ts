import { VPage } from "@/features/nodes/VPage";
import { LNode_TextEdit } from "./LNode_TextEdit";

export class LNode_Page extends LNode_TextEdit {
  getVNodeType(): typeof VPage {
    return VPage;
  }
}
