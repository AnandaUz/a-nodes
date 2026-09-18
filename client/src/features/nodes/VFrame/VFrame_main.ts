import type { INode } from "@shared/types";
import VFrame, { AREA_PADDING } from "./VFrame";
import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";
import type { VNode } from "../VNode";

export default class VFrame_main extends VFrame {
  constructor(node: INode, container: HTMLElement) {
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
    const btnInHeight = this.body.querySelector(
      ".ico-in-height",
    ) as HTMLElement;
    const btnLevels = this.body.querySelector(".ico-levels") as HTMLElement;

    btnAddFrame.onclick = (e) => {
      Tools.stopEvent(e);
      this.addFrame();
    };
    btnInHeight.onclick = (e) => {
      Tools.stopEvent(e);
      this.setHeightByNodes();
    };
    btnLevels.onclick = (e) => {
      Tools.stopEvent(e);
    };

    this.nodeEss.exData?.hh && this.setHeight(this.nodeEss.exData.hh || 0);
  }
  setHeightByNodes() {
    let maxY = this.y + 20;
    this.helpers.forEach((h) => {
      // h.elNodeFrame.style.height = "max-content";
      const node = h.mainNode;
      maxY = Math.max(maxY, node.y + node.height);
      // maxHeight = Math.max(maxHeight, h.height);
    });

    // если внизу фрейма ктото есть, он их подхватит тоже
    const STEP = 50;
    const rect = {
      x: this.x,
      y: maxY,
      width: this.width,
      height: STEP,
    } as DOMRect;
    const m: VNode[] = [];
    while (true) {
      const nodesOverRect = core.selectManager.getNodeOverRect(rect);
      if (nodesOverRect.length > 0) {
        m.push(...nodesOverRect);
      } else {
        break;
      }
      rect.y += STEP;
    }
    if (m.length > 0) {
      m.forEach((node: VNode) => {
        if (node instanceof VFrame) return;
        maxY = Math.max(maxY, node.y + node.height);
        this.addHelper(node);
      });
      this.refreshHelpersUp();
    }

    this.height =
      Math.max(maxY - this.y, AREA_PADDING.top + 40) + AREA_PADDING.bottom;

    this.setHeight(this.height);
    this.save();
  }
  setHeight(height: number) {
    this.height = height;
    this.body.style.height = `${height}px`;
    if (!this.nodeEss.exData) {
      this.nodeEss.exData = {};
    }
    this.nodeEss.exData.hh = height;
  }
  async addFrame() {
    const bounds = this.bodyRect;
    const newNode: INode = {
      exData: {
        ownerNodesIds: [this.nodeEss._id || ""],
        bgColor: Math.round(Math.random() * 360).toString(),
        hh: 220,
      },
      type: NODE_TYPES.MANAGER.frame_main,
      x: Tools.getDiskPosition(this.x + bounds.width + GRID.x),
      y: Math.round(this.y),
      title: "Сортировщик",
    };

    const vNode = await core.nodeManager.createNode(newNode);
    const frame = core.nodeRenderer.getVNode(vNode?._id || "") as VFrame_main;
    if (frame) {
      core.frameCore.addFrame(frame);
      core.frameCore.refreshSpatialGrid();

      this.subFrames.set(frame.nodeEss._id || "", frame);
      frame.mainFrames.set(this.nodeEss._id || "", this);
      this.refreshHelpersUp();
    }

    // const mainFrame = this as VFrame_main;
    // const frame = core.nodeRenderer.getVNode(vNode?._id || "") as VFrame_main;
    // core.frameCore.addFrame(frame);
  }
  async addTextEditCloneNode(nodeEss: INode) {
    const x = this.x; //+ AREA_PADDING.left;
    const y = this.y + 20 + AREA_PADDING.top;

    const cloneNodeEss = await core.nodeManager.create_TextEditCloneNode(
      nodeEss,
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
