import type { INode } from "@shared/types";
import VTextEdit from "../VTextEdit";
import "./VFrame.scss";
import { core, EVENTS } from "@/features/core/core";

import { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";

export const AREA_PADDING = {
  left: 30,
  top: 20,
};

export default class VFrame extends VTextEdit {
  helpers: Helper[] = [];
  helpersById: Record<string, Helper> = {};
  elSubTitle?: HTMLElement;
  elBtnsBlock?: HTMLElement;
  subFrames: Map<string, VFrame> = new Map();
  mainFrames: Map<string, VFrame> = new Map();
  helperType: new (vnode: VNode, mainFrame: VFrame) => Helper = Helper as any;

  static frames: VFrame[] = [];

  // events = new EventEmitter<VNodeEvents>();
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-frame");
    VFrame.frames.push(this);

    // if (!core.managerCore) core.managerCore = new ManagerCore();

    this.unsubscribers.push(
      // core.store.on(EVENTS.renderer.refreshAllVNodes, () => {
      //   // this.initHelpers();
      // }),
      // core.store.on(EVENTS.nodes.created, (_nodeEss: INode) => {
      //   // this.initHelpers();
      // }),
      core.store.on(EVENTS.nodes.moved, (nodeEss: INode) => {
        if (!nodeEss || !nodeEss._id) return;
        if (this.helpersById[nodeEss._id]) this.refreshHelpers();
      }),
      // core.store.on(EVENTS.frame.sub.connected, ({ subFrame, mainFrame }) => {

      //   if (mainFrame !== this) return;
      //   if (this.subFrames.has(subFrame.nodeEss._id || "")) return;
      //   this.subFrames.set(subFrame.nodeEss._id || "", subFrame);
      //   // this.initHelpers();
      // }),
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

  refreshHelpers() {
    this.helpers.sort((a, b) => a.mainNode.y - b.mainNode.y);

    let prevListLevel = 0;
    let prevHelpers: Helper[] = [];

    this.helpers.forEach((h, i) => {
      const vNodeX = h.mainNode.x;
      const vNodeY = h.mainNode.y;

      if (!this.checkPointOver(vNodeX, vNodeY)) {
        this.removeHelper(h._id);
        return;
      }
      let listLevel = Math.round((vNodeX - this.x) / GRID.x);
      listLevel = Math.min(listLevel, prevListLevel + 1);
      listLevel = Math.max(listLevel, 0);

      if (listLevel > 0) h.prevLevelHelper = prevHelpers[listLevel - 1];
      else h.prevLevelHelper = undefined;
      prevHelpers[listLevel] = h;

      //задаём тайтлы
      let parentsTitles: string[] = [];
      if (h instanceof Helper_main) {
        h.fromHelpers.forEach((mainHelper) => {
          const refFunc2 = (helper: Helper_main) => {
            // console.log((helper?.mainNode as VTextEdit).title)
            if (!helper?.mainNode) return;
            parentsTitles.push((helper.mainNode as VTextEdit).title || "");

            if (helper && helper.prevLevelHelper) {
              refFunc2(helper.prevLevelHelper as Helper_main);
            }
          };
          refFunc2(mainHelper.prevLevelHelper as Helper_main);
        });
      }
      if (parentsTitles.length > 0) {
        h.setParentsTitles(parentsTitles);
      }

      h.mainNode.body.dataset.level = listLevel + "";

      prevListLevel = listLevel;

      /////////

      // const mainNodeTitle = h.mainNode.nodeEss.title || "";

      // установка кругов
      // if (h instanceof Helper_main && h.fromHelpers.length > 0) {
      //   const fromHelpers = h.fromHelpers[0] as Helper_main;
      //   if (fromHelpers) {
      //     const ii = (this.helpers.length - i) / this.helpers.length;

      //     fromHelpers.level = Math.round(Math.pow(ii, 2) * 10);
      //   }
      // }

      const x = this.x + listLevel * GRID.x;
      const y = h.mainNode.y;

      h.mainNode.moveTo({ x, y });

      h.render();
    });

    // запускаем рефрешиться сл фрейм
    const refFunc = (ff: Map<string, VFrame>) => {
      ff.forEach((nf) => {
        nf.refreshHelpers();
        refFunc(nf.subFrames);
      });
    };
    refFunc(this.subFrames);
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
      // this.initHelpers();
    }
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
