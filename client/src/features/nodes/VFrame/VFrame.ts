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
        if (this.helpersById[nodeEss._id]) this.refreshHelpersUp();
      }),
      // core.store.on(EVENTS.frame.sub.connected, ({ subFrame, mainFrame }) => {

      //   if (mainFrame !== this) return;
      //   if (this.subFrames.has(subFrame.nodeEss._id || "")) return;
      //   this.subFrames.set(subFrame.nodeEss._id || "", subFrame);
      //   // this.initHelpers();
      // }),
      // core.store.on(EVENTS.nodes.moved, (_nodeEss: INode) => {
      //   this.onVNodeMove();
      // }),
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
  /** начинает именно с главного фрейма */
  refreshHelpers_super() {
    let superFrame: VFrame = this;
    while (superFrame.mainFrames?.size > 0) {
      superFrame = superFrame.mainFrames.values().next().value as VFrame;
    }
    superFrame.refreshHelpersUp();
  }
  refreshHelpersUp() {
    this.helpers.sort((a, b) => a.mainNode.y - b.mainNode.y);

    let prevListLevel = 0;
    let prevHelpers: Helper[] = [];

    if (this.nodeEss.title === "s1") {
      console.log(this.nodeEss.title);
    }

    this.helpers.forEach((h, i) => {
      const vNodeX = h.mainNode.x;
      const vNodeY = h.mainNode.y;

      if (!this.checkPointOver(vNodeX, vNodeY)) {
        this.removeHelper(h._id);

        this.refreshHelpers_super();
        return;
      }
      let listLevel = Math.round((vNodeX - this.x) / GRID.x);
      listLevel = Math.min(listLevel, prevListLevel + 1);
      listLevel = Math.max(listLevel, 0);
      if (i == 0) listLevel = 0;

      // задаём toHelper - т.е. проверяем есть ли в сабФреймах клоны ноды
      h.toHelper.clear();
      // console.log((h.mainNode as VTextEdit).title);
      this.subFrames.forEach((subFrame) => {
        subFrame.helpers.forEach((subH) => {
          const mainID =
            h.mainNode.nodeEss.exData?.ownerNodesIds?.[0] ||
            h.mainNode.nodeEss._id ||
            "";
          if (subH.mainNode.nodeEss.exData?.ownerNodesIds?.includes(mainID)) {
            h.toHelper.set(subFrame._id, subH);
            subH.fromHelpers.push(h);
          }
        });
      });

      // if (listLevel > 0) h.prevLevelHelper = prevHelpers[listLevel - 1];
      // else h.prevLevelHelper = undefined;
      prevHelpers[listLevel] = h;

      //задаём тайтлы
      let parentsTitles: string[] = [];
      if (h instanceof Helper_main) {
        if (h.toHelper.size > 0) {
          for (let i = 0; i < listLevel; i++) {
            parentsTitles.push(
              (prevHelpers[i]?.mainNode as VTextEdit).title || "",
            );
          }
          h.toHelper.forEach((subHelper) => {
            if (h.parentsTitles.length > 0) {
              parentsTitles = [...parentsTitles, "•", ...h.parentsTitles];
            }
            subHelper.setParentsTitles(parentsTitles);
          });
        }
      }

      h.mainNode.body.dataset.level = listLevel + "";

      prevListLevel = listLevel;

      const x = this.x + listLevel * GRID.x;
      const y = h.mainNode.y;

      h.mainNode.moveTo({ x, y });
      h.placeTo();

      h.render();
    });

    // запускаем рефрешиться сл фрейм или идём вниз
    if (this.subFrames.size > 0) {
      this.subFrames.forEach((nf) => {
        nf.refreshHelpersUp();
      });
    } else {
      this.refreshHelpersDown();
    }
  }
  refreshHelpersDown() {
    // установка кругов
    const linkedHelpers: Helper_main[] = [];
    this.helpers.forEach((helper) => {
      if (helper instanceof Helper_main && helper.fromHelpers.length > 0) {
        const fromHelpers = helper.fromHelpers[0] as Helper_main;
        if (fromHelpers) {
          linkedHelpers.push(helper);
        }
      }
    });
    const count = linkedHelpers.length;
    linkedHelpers.forEach((helper, i) => {
      const fromHelpers = helper.fromHelpers[0] as Helper_main;
      if (fromHelpers) {
        const ii = (count - i) / count;

        fromHelpers.level = Math.round(Math.pow(ii, 2) * 10);
      }
    });
    this.mainFrames.forEach((mf) => {
      mf.refreshHelpersDown();
    });
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
    const node = helper.mainNode;
    helper.remove();
    delete this.helpersById[_id];
    this.helpers = this.helpers.filter((h) => h._id !== _id);
    node.body.dataset.level = "";

    const fromHelpers = helper.fromHelpers[0] as Helper_main;
    if (fromHelpers) fromHelpers.level = 0;
  }
}
