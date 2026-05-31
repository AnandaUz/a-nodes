import type { INode } from "@shared/types";
import VTextEdit from "./VTextEdit";
import { core, EVENTS } from "../core/core";

export default class VTextEditClone extends VTextEdit {
  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    this.body.classList.add("clone");

    this.elTitle.addEventListener("input", () => {
      //   const nodeEss = this.nodeEss;
      //   nodeEss.title = this.elTitle.innerText;
      //   core.store.emit(EVENTS.nodes.updated, nodeEss);
    });
  }

  set title(v: string | undefined) {
    const ownerId = this.nodeEss.exData?.ownerNodeId;
    if (!ownerId) return;
    this.nodeEss.title = v;
    const ownerNode = core.nodeManager.nodes.get(ownerId);
    if (!ownerNode) return;

    ownerNode.title = v;
    core.store.emit(EVENTS.nodes.updated, ownerNode);
  }
  get title() {
    const ownerId = this.nodeEss.exData?.ownerNodeId;
    if (!ownerId) return;
    const ownerNode = core.nodeManager.nodes.get(ownerId);
    return ownerNode?.title || "";
  }
}
