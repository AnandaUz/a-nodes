import { core, EVENTS } from "@/features/core/core";
import { SpatialGrid } from "@/features/SpatialGrid";
import VTextEdit from "../VTextEdit";
import VTextEditClone from "../VTextEditClone";
import VFrame from "./VFrame";
import type VFrame_main from "./VFrame_main";
import type { Helper } from "./Helper/Helper";
import type { VNode } from "../VNode";

export class FrameCore {
  private unsubscribers: (() => void)[] = [];
  frames = {
    main: new Map<string, VFrame_main>(),
    // subs: new Map<string, VM_frame_sub>(),
  };
  protected spatialGrid = new SpatialGrid(100);
  init() {
    this.unsubscribers.push(
      core.store.on(EVENTS.nodes.moved, (node) => {
        if (node instanceof VFrame) {
          this.refreshSpatialGrid();
        } else {
          if (node instanceof VTextEdit || node instanceof VTextEditClone) {
            this.initHelper(node);
          }
        }
      }),
    );
  }
  refresh() {
    this.refreshSpatialGrid();
    this.initLinks();

    this.initHelpers();

    this.refreshFrames();
  }
  refreshFrames() {
    this.frames.main.forEach((frame) => {
      if (frame.mainFrames.size == 0) {
        frame.refreshHelpers();
      }
    });
  }

  initLinks() {
    const frames = this.frames.main;
    frames.forEach((frame) => {
      const mainFrames = frame.nodeEss.exData?.ownerNodesIds;
      if (mainFrames) {
        mainFrames.forEach((id) => {
          const mainFrame = core.nodeRenderer.getVNode(id);
          if (mainFrame instanceof VFrame) {
            mainFrame.subFrames.set(frame.nodeEss._id || "", frame);
            frame.mainFrames.set(mainFrame.nodeEss._id || "", mainFrame);
            // core.store.emit(EVENTS.frame.sub.connected, {
            //   mainFrame,
            //   subFrame: this,
            // });
          }
        });
      }
    });
  }
  refreshSpatialGrid() {
    const frames = this.frames.main;
    frames.forEach((frame) => {
      this.spatialGrid.registerFrame(frame);
    });
  }
  addFrame(frame: VFrame) {
    this.frames.main.set(frame.nodeEss._id || "", frame as VFrame_main);
  }
  initHelper(vnode: VNode): { frame: VFrame | null; helper: Helper | null } {
    if (vnode instanceof VTextEdit && !(vnode instanceof VFrame)) {
      const { x, y } = vnode;
      if (x === undefined || y === undefined)
        return { frame: null, helper: null };

      const candidates = this.spatialGrid.getCandidates(x, y); // экономит перебор фреймов

      for (const frame of candidates as VFrame[]) {
        if (frame.checkPointOver(x, y)) {
          let h = frame.helpersById[vnode._id];
          if (!h) {
            h = frame.addHelper(vnode);
            // h.render();
          }
          return { frame: frame, helper: h };
        }
      }
    }
    return { frame: null, helper: null };
  }

  initHelpers() {
    // const frames = this.frames.main;
    core.nodeRenderer.getAllNodes().forEach((vnode) => {
      this.initHelper(vnode);
    });
    // frames.forEach((frame) => {
    //   frame.refreshHelpers();
    // });
  }
  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}
