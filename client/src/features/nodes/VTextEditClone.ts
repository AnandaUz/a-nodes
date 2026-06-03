// import type { INode } from "@shared/types";
import VTextEdit from "./VTextEdit";
import { core, EVENTS } from "../core/core";

export default class VTextEditClone extends VTextEdit {
  sourceVNode: VTextEdit | undefined;

  init(): void {
    super.init();
    this.body.classList.add("clone");
    const sourceNodeId = this.nodeEss.exData?.ownerNodesIds?.[0];
    if (!sourceNodeId) return;
    this.sourceVNode = core.nodeRenderer.getVNode(sourceNodeId) as VTextEdit;
    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.updated, (nodeEss) => {
        if (nodeEss._id === this.sourceVNode?._id) {
          this.title = nodeEss.title;
        }
      }),
    );
  }

  // set title(v: string | undefined) {

  //   this.titleEl.innerHTML = v || "";
  //   this.sourceNode.title = v;
  //   this.sourceNode.turnOff_EditTitleMode();
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
}
