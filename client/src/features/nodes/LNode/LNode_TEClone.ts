import { LNode } from "./LNode";
import { LNode_TextEdit } from "./LNode_TextEdit";
import VTextEditClone from "../VTextEditClone";
import type { INodeDB } from "@shared/types/INodeDB";
import { core } from "@/features/core/core";

// для упаковки
const SOURCE_LID_BITS = 17; // 0x1ffff
const SOURCE_LID_MASK = (1 << SOURCE_LID_BITS) - 1; // 0x1ffff

export class LNode_TEClone extends LNode_TextEdit {
  /** нода оригинал */
  sourceNode: LNode_TextEdit | undefined;
  /** нода родитель */
  mainNode: LNode_TextEdit | undefined;
  mainNodeLID?: number;

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
  onInput() {
    const vNode = this.vNode as VTextEditClone;
    // this.setTitleText(vNode.titleEl.innerText);
    if (this.sourceNode) {
      this.sourceNode.setTitleText(vNode.titleEl.innerText, true, this);
      this.title = vNode.titleEl.innerText;
      this.sourceNode.save();
    }
  }
  /** возращает ноду оригинал */
  getSourceNode(): LNode_TextEdit | undefined {
    let sNode: LNode = this;
    while (!(sNode instanceof LNode_TextEdit)) {
      if (sNode instanceof LNode_TEClone) {
        sNode = sNode.mainNode as LNode;
      }
    }
    return sNode;
  }
  /** для совместимости */
  forCompatibility() {
    const sourceNodeId = this.exData?.ownerNodesIds?.[0];
    if (!sourceNodeId) return;
  }
  getVNodeType() {
    return VTextEditClone;
  }
  toDB(): INodeDB {
    const res: INodeDB = super.toDB();
    res.title = undefined;
    if (this.mainNodeLID) {
      res.A = this.mainNodeLID & SOURCE_LID_MASK;
    }
    return res;
  }
  fromDB(db: INodeDB) {
    super.fromDB(db);
    if (db.A) {
      this.mainNodeLID = db.A & SOURCE_LID_MASK;
    }
  }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;

    const vNode = this.vNode as VTextEditClone;
    if (!vNode) return;
    vNode.titleEl.contentEditable = "false";

    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
    if (!this.sourceNode) {
      return;
    }

    this.sourceNode.title = this.title || "";
    this.sourceNode.turnOff_EditTitleMode();
  }
  set title(v: string | undefined) {
    if (!this.sourceNode) return;
    this.sourceNode.title = v || "";
  }
  get title() {
    if (!this.sourceNode) return "#######";
    return this.sourceNode.title;
  }

  highlight() {
    (this.sourceNode?.vNode as VTextEditClone)?.highlight();
  }
  unhighlight() {
    (this.sourceNode?.vNode as VTextEditClone)?.unhighlight();
  }
}
