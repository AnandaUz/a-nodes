import { core } from "@/features/core/core";
import VTextEdit from "../VNode/VTextEdit";
import { LNode } from "./LNode";

import TFrame from "./TFrame";
import type { LNode_TEClone } from "./LNode_TEClone";

export class LNode_TextEdit extends LNode {
  isEditMode: boolean = false;
  declare vNode?: VTextEdit;

  frame = new TFrame(this);
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
    if (this.clones.nodes.size > 0) {
      this.clones.nodes.forEach((cl) => {
        (cl as LNode_TEClone).setLineOfParentsTitle();
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
    const vNode = this.vNode;
    if (!vNode) return;
    if (putInInnerHTML) vNode.titleEl.innerText = v || "";

    const startH = vNode.height;
    vNode.refreshBodyRect();
    const endH = vNode.height;

    if (startH !== endH) {
      if (this.list.parentNode) {
        this.list.mainParent?.list.setPositionForChildren();
      }
    }

    if (this.clones.nodes.size > 0) {
      this.clones.nodes.forEach((subNode) => {
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
    if (this.clones.nodes.size > 0) {
      this.clones.doForAll((node) => (node as LNode_TEClone).highlight());
    }
  }
  unselect() {
    super.unselect();
    if (this.clones.nodes.size > 0)
      this.clones.doForAll((node) => (node as LNode_TEClone).unhighlight());
  }
  highlight() {
    this.vNode?.highlight();
  }
  unhighlight() {
    this.vNode?.unhighlight();
  }
  onInput() {
    const vNode = this.vNode as VTextEdit;
    if (!vNode) return;

    this.title = vNode.titleEl.innerText;
    this.setTitleText(this.title);
  }
  moveTo(
    position: { x: number | undefined; y: number | undefined },
    save = true,
  ) {
    super.moveTo(position, save);
    this.frame.redrawPaths();
  }
  onPointerMove() {
    this.frame.redrawPaths();
  }
}
