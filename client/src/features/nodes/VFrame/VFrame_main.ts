import type { INode } from "@shared/types";
import VFrame, { AREA_PADDING } from "./VFrame";
import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";

export default class VFrame_main extends VFrame {
  constructor(node: INode, container: HTMLElement) {
    super(node, container);
    this.helperType = Helper_main as any;
  }
  init(): void {
    super.init();
    const btnAddFrame = document.createElement("div");
    btnAddFrame.className = "btn ico ico-plus";
    btnAddFrame.title = "Add Frame";
    this.elBtnsBlock?.appendChild(btnAddFrame);

    btnAddFrame.onclick = (e) => {
      Tools.stopEvent(e);
      this.addFrame();
    };
  }
  async addFrame() {
    const bounds = this.bodyRect;
    const newNode: INode = {
      exData: {
        ownerNodesIds: [this.nodeEss._id || ""],
        bgColor: Math.round(Math.random() * 360).toString(),
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
