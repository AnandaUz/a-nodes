import { LNode } from "./LNode";
import { LNode_TextEdit } from "./LNode_TextEdit";
import VTextEditClone from "../VNode/VTextEditClone";
import { core } from "@/features/core/core";
import type VTextEdit from "../VNode/VTextEdit";

export class LNode_TEClone extends LNode_TextEdit {
  declare vNode?: VTextEditClone;

  constructor() {
    super();

    this.list.onTotalIndexChanged((v: number) => {
      this.setRating(v);
    });
  }
  init(): void {
    super.init();
    this.forCompatibility();
  }
  setRating(v: number) {
    const vNode = this.vNode;
    if (!vNode) return;

    (this.clones.mainNode?.vNode as VTextEdit)?.setRating(
      v,
      this.list.getMainParent()?.lID ?? 0,
    );
  }

  setLineOfParentsTitle() {
    const vNode = this.vNode;
    if (!vNode) return;
    vNode.elLineOfParentsTitle.innerHTML = "";

    const mainNode = this.clones.mainNode;
    if (!mainNode) return;
    const parentsTitles: string[] = [];
    let sNode: LNode = mainNode;
    let t = 10;
    while (sNode.list.parentNode) {
      sNode = sNode.list.parentNode;
      parentsTitles.push(sNode.title || "");
      if (t-- < 0) break;
    }
    vNode.elLineOfParentsTitle.innerHTML = parentsTitles
      .map((s) => `<span>${s}</span>`)
      .join("");
  }
  onInput() {
    const vNode = this.vNode;
    // this.setTitleText(vNode.titleEl.innerText);
    if (this.clones.sourceNode && vNode) {
      this.clones.sourceNode.setTitleText(vNode.titleEl.innerText, true, this);
      this.title = vNode.titleEl.innerText;
      this.clones.sourceNode.save();
    }
  }

  /** для совместимости */
  forCompatibility() {
    const sourceNodeId = this.exData?.ownerNodesIds?.[0];
    if (!sourceNodeId) return;
  }
  getVNodeType() {
    return VTextEditClone;
  }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;

    const vNode = this.vNode;
    if (!vNode) return;
    vNode.titleEl.contentEditable = "false";

    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
    if (!this.clones.sourceNode) {
      return;
    }

    this.clones.sourceNode.title = this.title || "";
    this.clones.sourceNode.turnOff_EditTitleMode();
  }
  set title(_v: string | undefined) {
    // if (!this.clones.sourceNode) return;
    // this.clones.sourceNode.title = v || "";
  }
  get title() {
    // if (!this.clones.sourceNode) return "#######";
    // return this.clones.sourceNode.title;
    return undefined;
  }

  selectPost() {
    this.clones.sourceNode?.clones.doForAll((node) => node.highlight());
  }
  unselect() {
    super.unselect();
    this.clones.sourceNode?.clones.doForAll((node) => node.unhighlight());
  }
}
