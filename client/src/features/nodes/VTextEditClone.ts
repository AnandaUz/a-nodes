// import type { INode } from "@shared/types";
import VTextEdit from "./VTextEdit";
import { core, EVENTS } from "../core/core";

export default class VTextEditClone extends VTextEdit {
  sourceVNode: VTextEdit | undefined;

  init(): void {
    super.init();
    this.body.classList.add("is-clone");
    const sourceNodeId = this.nodeEss.exData?.ownerNodesIds?.[0];
    if (!sourceNodeId) return;
    this.sourceVNode = core.nodeRenderer.getVNode(sourceNodeId) as VTextEdit;
    this.sourceVNode.subNodes.set(this.nodeEss._id || "", this);
    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.updated, (nodeEss) => {
        if (nodeEss._id === this.sourceVNode?._id) {
          this.title = nodeEss.title;
        }
      }),
    );
  }
  onInput() {
    this.setTitleText(this.titleEl.innerText);
    if (this.sourceVNode) {
      this.sourceVNode.title = this.titleEl.innerText;
      this.sourceVNode.setTitleText(this.title, true);

      //обновляем детей
      this.sourceVNode.subNodes.forEach((subNode) => {
        if (subNode === this) return;
        subNode.setTitleText(this.title, true);
      });
    }
  }

  // onInput() {
  //   this.sourceVNodetitle = this.titleEl.innerText;
  //   const startH = this.height;
  //   this.refreshBodyRect();
  //   const endH = this.height;

  //   if (startH < endH) {
  //     // this.moveAniTo(null, this.y - (endH - startH));
  //     const rect = { ...this.bodyRect, height: endH };
  //     core.nodeRenderer.pushdown_nodes_out_of_rect(rect, [this]);
  //   }

  //   //обновляем детей
  //   this.subNodes.forEach((subNode) => {
  //     subNode.title = this.title;
  //   });
  // }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;

    this.titleEl.contentEditable = "false";

    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
    if (!this.sourceVNode) {
      return;
    }

    this.sourceVNode.title = this.title || "";
    this.sourceVNode.turnOff_EditTitleMode();
  }
  set title(v: string | undefined) {
    if (!this.sourceVNode) return;
    this.sourceVNode.title = v || "";
  }
  get title() {
    if (!this.sourceVNode) return "#######";
    return this.sourceVNode.nodeEss.title;
  }

  highlight() {
    this.sourceVNode?.highlight();
  }
  unhighlight() {
    this.sourceVNode?.unhighlight();
  }
}
