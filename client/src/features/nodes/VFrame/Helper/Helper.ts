import { core, EVENTS } from "@/features/core/core";
import type { VNode } from "../../VNode/VNode";
import type VM_frame_main from "../VFrame_main";
import type { LNode } from "../../LNode/LNode";

export class Helper {
  body: HTMLDivElement;
  _id: string;
  mainNode: VNode;
  mainFrame: VM_frame_main;
  btnBlockEl: HTMLDivElement;
  strBlockEl: HTMLDivElement;
  isMoving: boolean = false;
  listLevel: number = 0;

  fromHelpers: Helper[] = [];
  toHelper: Map<string, Helper> = new Map();
  parentsTitles: string[] = [];
  // prevLevelHelper: Helper | undefined = undefined;

  unsubscribers: Array<() => void> = [];

  // subFrames: VM_frame;
  constructor(mainNode: VNode, mainFrame: VM_frame_main) {
    this.body = document.createElement("div");
    this.mainNode = mainNode;
    this.mainFrame = mainFrame;
    this._id = mainNode.node._id || "";
    // this.subFrames = subFrames;
    this.body.className = "vnode-helper";
    this.body.innerHTML = `<div class="bt-block"></div>
    <div class="str-block"></div>`;
    this.btnBlockEl = this.body.querySelector(".bt-block") as HTMLDivElement;
    this.strBlockEl = this.body.querySelector(".str-block") as HTMLDivElement;
    core.desk.nodesEl.appendChild(this.body);
    this.placeTo();

    // let startSelectedNodes: Map<string, VNode> = new Map();
    this.unsubscribers.push(
      core.store.on(EVENTS.node.moving, (node: LNode) => {
        if (node._id === this.mainNode.node._id) {
          this.placeTo();

          if (!this.isMoving) {
            this.isMoving = true;
            // startSelectedNodes = core.selectManager.selectedNodes;
            // выделяем подпункты, если не зажат шифт
            if (!core.mode.mouseStatus.shift) {
              const s = this.mainFrame.getAllSubHelpers(this);
              if (s.length) {
                core.selectManager.addToSelectedNodes(s.map((h) => h.mainNode));
              }
            }
          }
        }
      }),
      core.store.on(EVENTS.node.updated, (node: LNode) => {
        if (node._id === this.mainNode.node._id) {
          const x = node.x || 0;
          const y = node.y || 0;

          if (!this.mainFrame.checkPointOver(x, y)) {
            this.mainFrame.removeHelper(this._id);

            // this.refreshHelpers_super();
            return;
          }
          this.placeTo();
          this.isMoving = false;
        }
      }),
      core.store.on(EVENTS.node.inTrash, (node: LNode) => {
        if (node._id === this.mainNode.node._id) {
          this.mainFrame.removeHelper(this._id);

          this.mainFrame.refreshHelpers_super();
        }
      }),
    );
  }
  setParentsTitles(parentsTitles: string[]) {
    let str = "";
    for (let i = 0; i < parentsTitles.length; i++) {
      str += `<span>${parentsTitles[i]?.replace(/_{2,}/g, "")}</span>`;
    }
    this.strBlockEl.innerHTML = str;
    this.parentsTitles = parentsTitles;
    this.mainNode.body.style.paddingTop = "10px";
    this.mainNode.refreshBodyRect();
  }
  placeTo() {
    const x = this.mainNode.node.x || 0;
    const y = this.mainNode.node.y || 0;
    this.body.style.transform = `translate(${x}px, ${y}px)`;
  }
  render() {}
  init() {}
  remove() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.body.remove();
  }
}
