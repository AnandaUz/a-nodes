import { LNode } from "./LNode";
import { LNode_TextEdit } from "./LNode_TextEdit";
import VTextEditClone from "../VNode/VTextEditClone";
import type { INodeDB } from "@shared/types/INodeDB";
import { core } from "@/features/core/core";

// для упаковки
const SOURCE_LID_BITS = 17; // 0x1ffff
const SOURCE_LID_MASK = (1 << SOURCE_LID_BITS) - 1; // 0x1ffff

export class LNode_TEClone extends LNode_TextEdit {
  /** нода родитель */
  mainNode: LNode_TextEdit | undefined;
  mainNodeLID?: number;

  init(): void {
    super.init();
    this.forCompatibility();
  }

  setLineOfParentsTitle() {
    const vNode = this.vNode as VTextEditClone;
    if (!vNode) return;
    vNode.elLineOfParentsTitle.innerHTML = "";

    const mainNode = this.mainNode;
    if (!mainNode) return;
    const parentsTitles: string[] = [];
    let sNode: LNode = mainNode;
    while (sNode.list.parentNode) {
      sNode = sNode.list.parentNode;
      parentsTitles.push(sNode.title || "");
    }
    vNode.elLineOfParentsTitle.innerHTML = parentsTitles
      .map((s) => `<span>${s}</span>`)
      .join("");
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
  get sourceNode(): LNode_TextEdit | undefined {
    let sNode: LNode = this;
    while (sNode instanceof LNode_TEClone) {
      sNode = sNode.mainNode as LNode;
    }
    return sNode as LNode_TextEdit;
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

  selectPost() {
    this.sourceNode?.highlight();
  }
  unselect() {
    super.unselect();
    this.sourceNode?.unhighlight();
  }
}
