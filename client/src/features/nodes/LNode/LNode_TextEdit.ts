import { LNode } from "./LNode";
import { core } from "@/features/core/core";
import { createTitleHistoryCommand } from "@/features/core/commands/historyCommands";
import VTextEdit from "../VNode/VTextEdit";


import TFrame from "./TFrame";
import type { LNode_TEClone } from "./LNode_TEClone";

export class LNode_TextEdit extends LNode {
  isEditMode: boolean = false;
  isCreatedByEnter: boolean = false;
  declare vNode?: VTextEdit;

  frame = new TFrame(this);

  get isFrameIn(): boolean {
    return this.frame.isFrameIn;
  }
  set isFrameIn(v: boolean) {
    this.frame.isFrameIn = v;
  }

  get isFrameOut(): boolean {
    return this.frame.isFrameOut;
  }
  set isFrameOut(v: boolean) {
    this.frame.isFrameOut = v;
  }
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
  protected startTitle: string | undefined;

  turnOn_EditTitleMode() {
    if (core.mode.selectedVNodeCount > 1) {
      return;
    }
    // console.log("turnOn", this.title);
    this.startTitle = this.title;
    const sourceNode = this.clones?.sourceNode as LNode_TextEdit | undefined;
    if (sourceNode && sourceNode !== this) {
      sourceNode.startTitle = sourceNode.title;
    }
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
    document.removeEventListener("keydown", this.turnOf_edit_byEsc);

    const text = (this.title || "").trim();
    if (!text) {
      this.isCreatedByEnter = false;
      core.nodeManager.hardDeleteNode(this);
      return;
    }
    this.isCreatedByEnter = false;

    const vNode = this.vNode as VTextEdit;
    if (vNode) {
      vNode.titleEl.contentEditable = "false";
      const oldH = vNode.height;
      vNode.refreshBodyRect();
      if (oldH !== vNode.height) {
        const main = this.list.mainParent;
        if (main && (this.list.parentNode || this.list.children?.size)) {
          main.list.setPositionForChildren();
          main.vNode?.renderSVG();
        }
      }
    }
    this.save();

    const oldTitle = this.startTitle;
    const newTitle = this.title;
    if (oldTitle !== undefined && oldTitle !== newTitle && core.history) {
      core.history.push(
        createTitleHistoryCommand(this, oldTitle, newTitle ?? ""),
      );
    }
    this.startTitle = undefined;
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
    const startW = vNode.width;
    vNode.refreshBodyRect();
    const endH = vNode.height;

    if (startH !== endH || startW !== vNode.width) {
      const main = this.list.mainParent;
      if (main && (this.list.parentNode || this.list.children?.size)) {
        if (startH !== endH) main.list.setPositionForChildren();
        main.vNode?.renderSVG();
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
    if (!this.vNode) {
      this.frame.redrawPaths();
    }
  }
  onPointerMove() {
    this.frame.redrawPaths();
  }
}
