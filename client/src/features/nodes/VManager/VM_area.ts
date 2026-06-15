import type { INode } from "@shared/types";
import VTextEdit from "../VTextEdit";
import "./VManager.scss";
import { core, EVENTS } from "@/features/core/core";
import { ManagerCore } from "./ManagerCore";
import { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";

const GRID = {
  H_STEP: 50,
  V_STEP: 30,
};

export default class VM_area extends VTextEdit {
  helpers: Helper[] = [];
  helpersById: Record<string, Helper> = {};
  elSubTitle?: HTMLElement;
  elBtnsBlock?: HTMLElement;
  subAreas: Map<string, VM_area> = new Map();
  helperType: new (vnode: VNode, mainArea: VM_area) => Helper = Helper as any;
  // events = new EventEmitter<VNodeEvents>();
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-m-area");

    if (!core.managerCore) core.managerCore = new ManagerCore();

    this.unsubscribers.push(
      core.store.on(EVENTS.renderer.refreshAllVNodes, () => {
        this.initHelpers();
      }),
      core.store.on(EVENTS.nodes.created, (_nodeEss: INode) => {
        this.initHelpers();
      }),
      core.store.on(EVENTS.nodes.moved, (_nodeEss: INode) => {
        this.refreshHelpers();
      }),
      core.store.on(EVENTS.area.sub.connected, ({ subArea, mainArea }) => {
        if (mainArea !== this) return;
        if (this.subAreas.has(subArea.nodeEss._id || "")) return;
        this.subAreas.set(subArea.nodeEss._id || "", subArea);
        this.initHelpers();
      }),
    );
  }
  // init() {
  //   super.init();
  // }
  initMovingElement() {
    this.movingElement = this.body.querySelector(".top-block") as HTMLElement;
  }

  bodyInit() {
    this.body.innerHTML += `
      <div class="top-block">
        <div class="title-el"></div>               
      </div>
      <div class="menu-block">
        <div class="sub-title"></div>
        <div class="btns-block"></div>
      </div>`;
    this.elSubTitle = this.body.querySelector(".sub-title") as HTMLElement;
    this.elBtnsBlock = this.body.querySelector(".btns-block") as HTMLElement;
  }

  // render() {
  //   super.render();
  // }
  refreshHelpers() {
    this.helpers.sort((a, b) => a.mainNode.y - b.mainNode.y);

    let levelPrev = 0;
    this.helpers.forEach((h, _i) => {
      let sdvigX = Math.round((h.mainNode.x - this.x) / GRID.H_STEP);
      sdvigX = Math.min(sdvigX, levelPrev + 1);

      levelPrev = sdvigX;

      const x = this.x + sdvigX * GRID.H_STEP;
      const y = h.mainNode.y;

      // h.body.style.transform = `translate(${x}px, ${y}px)`;

      h.mainNode.moveTo({ x, y });

      // h.mainNode.x = this.x + GRID.H_STEP * i;
      // h.mainNode.y = this.y + GRID.V_STEP * i;
      h.render();
    });
  }

  initHelpers() {
    core.nodeRenderer.getAllNodes().forEach((vnode) => {
      if (vnode instanceof VTextEdit && vnode !== this) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        if (this.checkPointOver(x, y)) {
          if (vnode instanceof VTextEdit && !(vnode instanceof VM_area)) {
            let h = this.helpersById[vnode._id];
            if (!h) {
              h = this.addHelper(vnode);
            } else {
              h.render();
            }

            // h!.style.transform = `translate(${x}px, ${y}px)`;
          }
        }
      }
    });
    this.refreshHelpers();
  }
  addHelper(vnode: VNode) {
    const helper = new this.helperType(vnode, this);
    this.helpers.push(helper);
    this.helpersById[helper._id] = helper;
    return helper;
  }

  removeHelper(_id: string) {
    this.helpers = this.helpers.filter((h) => h._id !== _id);
    delete this.helpersById[_id];
  }
}
