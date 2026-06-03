import { core, EVENTS } from "@/features/core/core";
import VM_area from "../VM_area";
import type { VNode } from "../../VNode";
import type VM_area_main from "../VM_area_main";
import type { INode } from "@shared/types";

export class Helper {
  body: HTMLDivElement;

  nodeMain: VNode;
  areaMain: VM_area_main;
  elBtBlock: HTMLDivElement;

  unsubscribers: Array<() => void> = [];

  // areaSubs: VM_area;
  constructor(nodeMain: VNode, areaMain: VM_area) {
    this.body = document.createElement("div");
    this.nodeMain = nodeMain;
    this.areaMain = areaMain as VM_area_main;
    // this.areaSubs = areaSubs;

    this.body.className = "vnode-helper";
    this.body.innerHTML = `<div class="bt-block"></div>`;
    this.elBtBlock = this.body.querySelector(".bt-block") as HTMLDivElement;
    core.desk.nodesEl.appendChild(this.body);

    this.render();
    this.placeTo();

    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.moving, (nodeEss: INode) => {
        if (nodeEss._id === this.nodeMain.nodeEss._id) {
          this.placeTo();
        }
      }),
      core.store.on(EVENTS.nodes.updated, (nodeEss: INode) => {
        if (nodeEss._id === this.nodeMain.nodeEss._id) {
          this.placeTo();
        }
      }),
      core.store.on(EVENTS.nodes.deleted, (nodeEss: INode) => {
        if (nodeEss._id === this.nodeMain.nodeEss._id) {
          this.remove();
        }
      }),
    );
  }
  placeTo() {
    const x = this.nodeMain.x || 0;
    const y = this.nodeMain.y || 0;
    this.body.style.transform = `translate(${x}px, ${y}px)`;
  }
  render() {}
  init() {}
  remove() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.body.remove();
    this.areaMain.helpers.delete(this.nodeMain.nodeEss._id || "");
  }
}
