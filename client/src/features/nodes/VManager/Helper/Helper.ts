import { core, EVENTS } from "@/features/core/core";
// import VM_area from "../VM_area";
import type { VNode } from "../../VNode";
import type VM_area_main from "../VM_area_main";
import type { INode } from "@shared/types";

export class Helper {
  body: HTMLDivElement;
  _id: string;
  mainNode: VNode;
  mainArea: VM_area_main;
  btnBlockEl: HTMLDivElement;

  unsubscribers: Array<() => void> = [];

  // subAreas: VM_area;
  constructor(mainNode: VNode, mainArea: VM_area_main) {
    this.body = document.createElement("div");
    this.mainNode = mainNode;
    this.mainArea = mainArea;
    this._id = mainNode.nodeEss._id || "";
    // this.subAreas = subAreas;

    this.body.className = "vnode-helper";
    this.body.innerHTML = `<div class="bt-block"></div>`;
    this.btnBlockEl = this.body.querySelector(".bt-block") as HTMLDivElement;
    core.desk.nodesEl.appendChild(this.body);

    this.placeTo();

    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.moving, (nodeEss: INode) => {
        if (nodeEss._id === this.mainNode.nodeEss._id) {
          this.placeTo();
        }
      }),
      core.store.on(EVENTS.nodes.updated, (nodeEss: INode) => {
        if (nodeEss._id === this.mainNode.nodeEss._id) {
          this.placeTo();
        }
      }),
      core.store.on(EVENTS.nodes.deleted, (nodeEss: INode) => {
        if (nodeEss._id === this.mainNode.nodeEss._id) {
          this.remove();
        }
      }),
    );
  }
  placeTo() {
    const x = this.mainNode.x || 0;
    const y = this.mainNode.y || 0;
    this.body.style.transform = `translate(${x}px, ${y}px)`;
  }
  render() {}
  init() {}
  remove() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.body.remove();
    this.mainArea.removeHelper(this.mainNode.nodeEss._id || "");
  }
}
