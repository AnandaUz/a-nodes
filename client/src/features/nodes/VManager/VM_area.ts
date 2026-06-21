import type { INode } from "@shared/types";
import VTextEdit from "../VTextEdit";
import "./VManager.scss";
import { core, EVENTS } from "@/features/core/core";
import { ManagerCore } from "./ManagerCore";
import { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";
import VTextEditClone from "../VTextEditClone";

export const AREA_PADDING = {
  left: 30,
  top: 20,
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
      core.store.on(EVENTS.nodes.moved, (nodeEss: INode) => {
        if (!nodeEss || !nodeEss._id) return;
        if (this.helpersById[nodeEss._id]) this.refreshHelpers();
      }),
      core.store.on(EVENTS.area.sub.connected, ({ subArea, mainArea }) => {
        if (mainArea !== this) return;
        if (this.subAreas.has(subArea.nodeEss._id || "")) return;
        this.subAreas.set(subArea.nodeEss._id || "", subArea);
        this.initHelpers();
      }),
      core.store.on(EVENTS.nodes.moved, (_nodeEss: INode) => {
        this.onVNodeMove();
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

    let parentsTitles: string[] = [];

    this.helpers.forEach((h, i) => {
      const vNodeX = h.mainNode.x;
      const vNodeY = h.mainNode.y;
      if (!this.checkPointOver(vNodeX, vNodeY)) {
        this.removeHelper(h._id);
        return;
      }
      let sdvigX = Math.round((vNodeX - this.x - AREA_PADDING.left) / GRID.x);
      sdvigX = Math.min(sdvigX, levelPrev + 1);

      sdvigX = Math.max(sdvigX, 0);

      const mainNodeTitle = h.mainNode.nodeEss.title || "";

      if (h instanceof Helper_main && h.fromHelper.length > 0) {
        const fromHelper = h.fromHelper[0] as Helper_main;
        if (fromHelper) {
          const ii = (this.helpers.length - i) / this.helpers.length;

          fromHelper.level = Math.round(Math.pow(ii, 2) * 10);
        }
      }

      if (i == 0) {
        sdvigX = 0;
      }
      if (sdvigX === 0) {
        parentsTitles = [mainNodeTitle];
      } else {
        if (levelPrev >= sdvigX) {
          parentsTitles.splice(sdvigX - levelPrev - 1);
        }

        parentsTitles.push(mainNodeTitle);
      }

      if (h instanceof Helper_main) {
        if (h.toHelper.length > 0 && h.toHelper[0]) {
          h.toHelper[0].setParentsTitles(parentsTitles);
        }
      }

      levelPrev = sdvigX;

      const x = this.x + sdvigX * GRID.x + AREA_PADDING.left;
      const y = h.mainNode.y;

      // h.body.style.transform = `translate(${x}px, ${y}px)`;

      h.mainNode.moveTo({ x, y });

      h.render();
    });
  }
  onVNodeMove() {
    // this.helpers.forEach((h) => {
    //   const mainVNode = h.mainNode;
    //   const { x, y } = mainVNode;
    //   if (x === undefined || y === undefined) return;

    //   if (!this.checkPointOver(x, y)) {
    //     this.removeHelper(h._id);
    //   }
    // });
    let f = false;
    core.selectManager.selectedNodes.forEach((vnode) => {
      if (f) return;
      if (vnode instanceof VTextEdit && vnode !== this) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        if (this.checkPointOver(x, y)) {
          f = true;
        }
      }
    });

    if (f) {
      this.initHelpers();
    }
  }

  initHelpers() {
    core.nodeRenderer.getAllNodes().forEach((vnode) => {
      if (
        (vnode instanceof VTextEdit || vnode instanceof VTextEditClone) &&
        vnode !== this
      ) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        if (this.checkPointOver(x, y)) {
          if (!(vnode instanceof VM_area)) {
            let h = this.helpersById[vnode._id];
            if (!h) {
              h = this.addHelper(vnode);
            } else {
              h.render();
            }
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
    const helper = this.helpersById[_id];
    if (!helper) return;
    helper.remove();
    delete this.helpersById[_id];
    this.helpers = this.helpers.filter((h) => h._id !== _id);
  }
}
