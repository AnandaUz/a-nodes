import VFrame, { AREA_PADDING } from "./VFrame";
import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";
import type { LNode } from "../LNode/LNode";

export default class VFrame_main extends VFrame {
  constructor(node: LNode, container: HTMLElement) {
    super(node, container);
    this.helperType = Helper_main as any;
  }
  init(): void {
    super.init();
    this.elBtnsBlock!.innerHTML = `
    <div class="btn ico ico-levels" title="Levels"></div>

    <div class="btn ico ico-in-height" title="In Height"></div>
    
    <div class="btn ico ico-plus" title="Add Frame"></div>
    `;
    const btnAddFrame = this.body.querySelector(".ico-plus") as HTMLElement;
    // const btnInHeight = this.body.querySelector(
    //   ".ico-in-height",
    // ) as HTMLElement;
    const btnLevels = this.body.querySelector(".ico-levels") as HTMLElement;

    btnAddFrame.onclick = (e) => {
      Tools.stopEvent(e);
      this.addFrame();
    };
    // btnInHeight.onclick = (e) => {
    //   Tools.stopEvent(e);
    //   this.setHeightByNodes();
    // };
    btnLevels.onclick = (e) => {
      Tools.stopEvent(e);
    };

    // this.node.exData?.hh && this.setHeight(this.node.exData.hh || 0);
  }
  // setHeightByNodes() {
  //   let maxY = this.node.y + 20;
  //   this.helpers.forEach((h) => {
  //     // h.enodeFrame.style.height = "max-content";
  //     const node = h.mainNode;
  //     maxY = Math.max(maxY, node.node.y + node.height);
  //     // maxHeight = Math.max(maxHeight, h.height);
  //   });

  //   // если внизу фрейма ктото есть, он их подхватит тоже
  //   const STEP = 50;
  //   const rect = {
  //     x: this.x,
  //     y: maxY,
  //     width: this.width,
  //     height: STEP,
  //   } as DOMRect;
  //   const m: VNode[] = [];
  //   while (true) {
  //     const nodesOverRect = core.selectManager.getNodeOverRect(rect);
  //     if (nodesOverRect.length > 0) {
  //       m.push(...nodesOverRect);
  //     } else {
  //       break;
  //     }
  //     rect.y += STEP;
  //   }
  //   if (m.length > 0) {
  //     m.forEach((node: VNode) => {
  //       if (node instanceof VFrame) return;
  //       maxY = Math.max(maxY, node.node.y + node.height);
  //       this.addHelper(node);
  //     });
  //     this.refreshHelpersUp();
  //   }

  //   this.height =
  //     Math.max(maxY - this.node.y, AREA_PADDING.top + 40) + AREA_PADDING.bottom;

  //   this.setHeight(this.height);
  //   this.node.save();
  // }
  // setHeight(height: number) {
  //   this.height = height;
  //   this.body.style.height = `${height}px`;
  //   if (!this.node.exData) {
  //     this.node.exData = {};
  //   }
  //   this.node.exData.hh = height;
  // }
  async addFrame() {
    const bounds = this.bodyRect;
    const newNode: INode = {
      exData: {
        ownerNodesIds: [this.node._id || ""],
        bgColor: Math.round(Math.random() * 360).toString(),
        hh: 220,
      },
      type: NODE_TYPES.MANAGER.frame_main,
      x: Tools.getDiskPosition(this.node.x + bounds.width + GRID.x),
      y: Math.round(this.node.y),
      title: "Сортировщик",
    };

    const vNode = await core.nodeManager.createNode(newNode);
    const frame = core.nodeRenderer.getVNode(vNode?._id || "") as VFrame_main;
    if (frame) {
      core.frameCore.addFrame(frame);
      core.frameCore.refreshSpatialGrid();

      this.subFrames.set(frame.node._id || "", frame);
      frame.mainFrames.set(this.node._id || "", this);
      this.refreshHelpersUp();
    }

    // const mainFrame = this as VFrame_main;
    // const frame = core.nodeRenderer.getVNode(vNode?._id || "") as VFrame_main;
    // core.frameCore.addFrame(frame);
  }
  async addTextEditCloneNode(node: LNode) {
    const x = this.node.x; //+ AREA_PADDING.left;
    const y = this.node.y + 20 + AREA_PADDING.top;

    const cloneNodeEss = await core.nodeManager.create_TextEditCloneNode(
      node,
      x,
      y,
    );
    if (cloneNodeEss) {
      const cloneNode = core.nodeRenderer.getVNode(cloneNodeEss._id || "");
      cloneNode?.refreshBodyRect();

      if (cloneNode) {
        const rect = {
          x,
          y,
          width: cloneNode?.width,
          height: cloneNode?.height,
        } as DOMRect;
        core.nodeRenderer.pushdown_nodes_out_of_rect(rect, [cloneNode]);
        return { node: cloneNode };
      }
    }
  }
}
