import { core, EVENTS } from "@/features/core/core";
import VM_area_main from "./VManager/VM_area_main";
import type VM_area_sub from "./VManager/VM_area_sub";
import { VTextEdit } from "./VTextEdit";

export class VPage extends VTextEdit {
  init() {
    const elBtn = this.body.querySelector(".elBtn");
    elBtn.innerHTML = "🔗";

    elBtn.addEventListener("mousedown", (e) => {
      this.buttons = e.buttons;
    });
    elBtn.addEventListener("mouseup", (e) => {
      const ess = this.cItem.originalItem.ess;
      const url = "/nodes/" + ess._id;
      switch (this.buttons) {
        case 1:
          console.log(url);
          location.assign(url);
          break;
        case 4:
          window.open(url, "_blank");
          break;
      }
    });
  }
}
