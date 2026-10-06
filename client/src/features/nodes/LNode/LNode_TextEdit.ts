import { core } from "@/features/core/core";
import VTextEdit from "../VNode/VTextEdit";
import { LNode } from "./LNode";

import type { LNode_TEClone } from "./LNode_TEClone";

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
  refresh() {
    // this.vNode?.render();
    if (this.cloneNodes) {
      this.cloneNodes.forEach((cl) => {
        const node = cl as LNode_TEClone;
        node.setLineOfParentsTitle();
      });
    }
    this.list.children?.forEach((childNode) => {
      childNode.refresh();
    });
  }
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

    if (startH !== endH) {
      if (this.list.parentNode) {
        this.list.getMainParent()?.list.setPositionForChildren();
      }
    }

    if (this.cloneNodes) {
      this.cloneNodes.forEach((subNode) => {
        const f = subNode !== initFromClone;

        (subNode as LNode_TextEdit).setTitleText(v, f, initFromClone);
      });
    }
  }
  select() {
    super.select();
    this.selectPost();
  }
  selectPost() {
    if (this.cloneNodes && this.cloneNodes?.size > 0) {
      this.highlight();
    }
  }
  unselect() {
    super.unselect();
    this.unhighlight();
  }
  highlight() {
    this.vNode?.highlight();
    if (this.cloneNodes && this.cloneNodes?.size > 0) {
      (this.cloneNodes as Set<LNode_TEClone>).forEach((node) => {
        node.highlight();
      });
    }
  }
  unhighlight() {
    this.vNode?.unhighlight();
    if (this.cloneNodes && this.cloneNodes?.size > 0) {
      (this.cloneNodes as Set<LNode_TEClone>).forEach((node) => {
        node.unhighlight();
      });
    }
  }
  onInput() {
    const vNode = this.vNode as VTextEdit;
    if (!vNode) return;

    this.title = vNode.titleEl.innerText;
    this.setTitleText(this.title);
  }
  get sourceNode(): LNode_TextEdit | undefined {
    return this;
  }
}
