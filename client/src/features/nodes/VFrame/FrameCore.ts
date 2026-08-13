import { core } from "@/features/core/core";
import { SpatialGrid } from "@/features/SpatialGrid";
import VTextEdit from "../VTextEdit";
import VTextEditClone from "../VTextEditClone";
import VFrame from "./VFrame";
import type VFrame_main from "./VFrame_main";

export class FrameCore {
  frames = {
    main: new Map<string, VFrame_main>(),
    // subs: new Map<string, VM_area_sub>(),
  };
  protected spatialGrid = new SpatialGrid(100);
  constructor() {
    // core.store.on(EVENTS.renderer.refreshAll, () => {
    //   this.init();
    // });
  }
  addFrame(frame: VFrame) {
    this.frames.main.set(frame.nodeEss._id || "", frame as VFrame_main);
  }

  initHelpers() {
    const areas = this.frames.main;
    areas.forEach((area) => {
      this.spatialGrid.registerArea(area);
    });

    core.nodeRenderer.getAllNodes().forEach((vnode) => {
      if (
        (vnode instanceof VTextEdit || vnode instanceof VTextEditClone) &&
        !(vnode instanceof VFrame)
      ) {
        const { x, y } = vnode;
        if (x === undefined || y === undefined) return;

        const candidates = this.spatialGrid.getCandidates(x, y); // экономит перебор фреймов

        for (const area of candidates as VFrame[]) {
          if (area.checkPointOver(x, y)) {
            let h = area.helpersById[vnode._id];
            if (!h) {
              h = area.addHelper(vnode);
              // h.render();
            }
            break;
          }
        }
      }
    });
    areas.forEach((area) => {
      area.refreshHelpers();
    });
  }
}
