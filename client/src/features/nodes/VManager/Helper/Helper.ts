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
  strBlockEl: HTMLDivElement;

  unsubscribers: Array<() => void> = [];

  // subAreas: VM_area;
  constructor(mainNode: VNode, mainArea: VM_area_main) {
    this.body = document.createElement("div");
    this.mainNode = mainNode;
    this.mainArea = mainArea;
    this._id = mainNode.nodeEss._id || "";

    // this.subAreas = subAreas;

    this.body.className = "vnode-helper";
    this.body.innerHTML = `<div class="bt-block"></div>
    <div class="str-block"></div>`;
    this.btnBlockEl = this.body.querySelector(".bt-block") as HTMLDivElement;
    this.strBlockEl = this.body.querySelector(".str-block") as HTMLDivElement;
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
      core.store.on(EVENTS.nodes.inTrash, (nodeEss: INode) => {
        if (nodeEss._id === this.mainNode.nodeEss._id) {
          this.remove();
        }
      }),
    );
  }
  setParentsTitles(parentsTitles: string[]) {
    let str = "";
    for (let i = 0; i < parentsTitles.length - 1; i++) {
      str = `<span>${parentsTitles[i]?.replace(/_{2,}/g, "")}</span>` + str;
    }
    this.strBlockEl.innerHTML = str;
    this.mainNode.body.style.paddingTop = "10px";
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
  }
}
