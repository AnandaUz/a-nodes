import VTextEdit from "../VTextEdit";
import "./VFrame.scss";
// import { core, EVENTS } from "@/features/core/core";
import { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { core } from "@/features/core/core";

export const AREA_PADDING = {
  left: 30,
  top: 20,
  bottom: 20,
};

export default class VFrame extends VTextEdit {
  helpers: Helper[] = [];
  helpersById: Record<string, Helper> = {};
  protected elSubTitle?: HTMLElement;
  protected elBtnsBlock?: HTMLElement;
  subFrames: Map<string, VFrame> = new Map();
  mainFrames: Map<string, VFrame> = new Map();
  protected helperType: new (vnode: VNode, mainFrame: VFrame) => Helper =
    Helper as any;

  // static frames: VFrame[] = [];

  constructor(node: LNode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("vnode-frame");
  }

  initMovingElement() {
    this.movingElement = this.body.querySelector(".top-block") as HTMLElement;
  }
  getAllSubHelpers(helper: Helper) {
    const subHelpers: Helper[] = [];
    let isStart = false;
    (this.helpers as Helper_main[]).some((h) => {
      // console.log((h.mainNode as VTextEdit).title);
      if (h === helper) {
        isStart = true;
      } else if (isStart) {
        if (h.listLevel > helper.listLevel) subHelpers.push(h);
        else return true;
      }
    });
    return subHelpers;
  }
  renderSVG() {
    // если есть дети, то рисуется фон в виде прямоугольника
    const children = this.node.list?.children;

    const lRect = this.node.getNodeRect();

    lRect.height = Math.max(lRect.height + 15, 60);

    if (!this.elSVG) {
      // const color = this.node.exData?.bgColor || "#d2eeff59";
      this.elSVG = core.desk.svgLayer.drawRect(
        lRect.x,
        lRect.y,
        lRect.width,
        lRect.height,
        `hsla(${this.node.exData?.bgColor || 0}, 70%, 90%, 0.3)`,
      );
    }

    this.elSVG.setAttribute("x", (lRect.x - 20).toString());
    this.elSVG.setAttribute("y", lRect.y.toString());
    this.elSVG.setAttribute("width", lRect.width.toString());
    this.elSVG.setAttribute("height", lRect.height.toString());

    // if (children && children.size > 0) {
    //   children?.forEach((c) => {
    //     c.vNode?.renderSVG();
    //   });
    // }
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
    console.log("refreshHelpersUp", new Date().getTime());
    this.helpers.sort((a, b) => a.mainNode.node.y - b.mainNode.node.y);

    let prevListLevel = 0;
    let prevHelpers: Helper[] = [];

    // if (this.node.title === "s1") {
    //   console.log(this.node.title);
    // }

    this.helpers.forEach((h, i) => {
      const vNodeX = h.mainNode.node.x;
      const vNodeY = h.mainNode.node.y;

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
            h.mainNode.node.exData?.ownerNodesIds?.[0] ||
            h.mainNode.node._id ||
            "";
          if (subH.mainNode.node.exData?.ownerNodesIds?.includes(mainID)) {
            h.toHelper.set(subFrame.node._id, subH);
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
      h.listLevel = listLevel;
      h.mainNode.refreshBodyRect();

      prevListLevel = listLevel;

      const x = this.node.x + listLevel * GRID.x;
      const y = h.mainNode.node.y;

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
    node.refreshBodyRect();

    const fromHelpers = helper.fromHelpers[0] as Helper_main;
    if (fromHelpers) fromHelpers.level = 0;
  }
}
