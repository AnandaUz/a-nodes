import { core } from "@/features/core/core";
import VTextEdit from "../VTextEdit";
import { LNode } from "./LNode";

export class LNode_TextEdit extends LNode {
  isEditMode: boolean = false;
  cloneNodes?: Set<LNode>;
  getVNodeType() {
    return VTextEdit;
  }
  turnOf_edit_byEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this.turnOff_EditTitleMode();
    }
  };
  turnOn_EditTitleMode() {
    if (core.mode.selectedVNodeCount > 1) {
      return;
    }
    // console.log("turnOn", this.title);
    core.mode.textEditing = true; // = DESK_MODE.TEXT_EDIT
    core.mode.textNode = true;
    this.isEditMode = true;
    // this.title = this.title; //так надо
    // this.elMove.turnOff()
    const vNode = this.vNode as VTextEdit;
    if (vNode) {
      vNode.titleEl.contentEditable = "true";
      vNode.titleEl.focus();
      document.addEventListener("keydown", this.turnOf_edit_byEsc);
    }
  }
  turnOff_EditTitleMode() {
    // console.log("turnOff", this.title);
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;
    const vNode = this.vNode as VTextEdit;
    if (vNode) {
      vNode.titleEl.contentEditable = "false";
      vNode.refreshBodyRect();
    }
    this.save();
    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
  }

  setTitleText(
    v: string | undefined,
    putInInnerHTML = false,
    initFromClone: any = null,
  ) {
    const vNode = this.vNode as VTextEdit;
    if (!vNode) return;
    if (putInInnerHTML) vNode.titleEl.innerText = v || "";

    const startH = vNode.height;
    vNode.refreshBodyRect();
    const endH = vNode.height;

    if (startH < endH) {
      // this.moveAniTo(null, this.y - (endH - startH));
      // const rect = { ...this.bodyRect, height: endH };
      // core.nodeRenderer.pushdown_nodes_out_of_rect(rect, [this]);
    }

    if (this.cloneNodes) {
      this.cloneNodes.forEach((subNode) => {
        if (subNode === initFromClone) return;
        (subNode as LNode_TextEdit).setTitleText(v, true);
      });
    }
  }
  onInput() {
    const vNode = this.vNode as VTextEdit;
    if (!vNode) return;

    this.title = vNode.titleEl.innerText;
    this.setTitleText(this.title);

    //обновляем детей
    //     vNode.subNodes.forEach((subNode) => {
    //       subNode.setTitleText(this.title, true);
    //     });
  }
  getSourceNode(): LNode_TextEdit | undefined {
    return this;
  }
}
