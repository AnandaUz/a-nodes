import type { INode } from "@shared/types";
import VFrame, { AREA_PADDING } from "./VFrame";
import { core, EVENTS } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import { NODE_TYPES } from "../node-registry";
import Helper_main from "./Helper/Helper_main";
import { GRID } from "@/features/core/CONST";

export default class VFrame_main extends VFrame {
  // framesMain = new Map<string, VFrame>();

  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    this.helperType = Helper_main as any;

    // core.managerCore!.frames.main.set(node._id!, this);

    this.unsubscribers
      .push
      // core.store.on(EVENTS.frame.sub.connected, ({ subFrame, mainFrame }) => {
      //   if (mainFrame !== this) return;
      //   this.framesMain.set(subFrame.nodeEss._id || "", subFrame);
      // }),
      // core.store.on(EVENTS.frame.sub.disconnected, ({ subFrame, mainFrame }) => {
      //   if (mainFrame !== this) return;
      //   this.framesMain.delete(subFrame.nodeEss._id || "");
      // }),
      // core.store.on(EVENTS.frame.sub.addNodeClone, (payload) => {
      //   const { subFrame } = payload;
      //   if (!this.subFrames.has(subFrame.nodeEss._id || "")) return;

      // }),
      ();
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
  addFrame() {
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
    core.nodeManager.createNode(newNode);
    // if (vNode instanceof VM_frame) {
    //   vNode.render();
    // }
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
        const helper = this.addHelper(cloneNode);

        // cloneNode.moveTo({ x: rect.x, y: rect.y });
        // this.refreshHelpers();

        core.store.emit(EVENTS.frame.sub.addNodeClone, {
          nodeEss: cloneNodeEss,
          subFrame: this,
        });
        return { node: cloneNode, helper };
      }
    }
  }
}
