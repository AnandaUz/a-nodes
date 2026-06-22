import { router } from "@/router";
import Tools from "../core/Tools";
import VTextEdit from "./VTextEdit";

export class VPage extends VTextEdit {
  init() {
    super.init();

    const btnEl = this.body.querySelector(".btn-el") as HTMLElement;

    // btnEl.addEventListener("mousedown", (e) => {
    //   // this.buttons = e.buttons;
    // });
    btnEl.addEventListener("mouseup", (e) => {
      Tools.stopEvent(e);
      const _id = this.nodeEss._id;
      let url = "";
      const essUrl = this.nodeEss.exData?.url;
      if (essUrl) {
        if (/^[a-f0-9]{24}$/i.test(essUrl)) {
          url = "/desk/" + essUrl;
        } else {
          url = essUrl;
        }
      } else {
        url = "/desk/" + _id;
      }
      console.log("mouse UP", e.buttons);

      switch (e.button) {
        case 0:
          router.navigate(url);
          break;
        case 1:
          window.open(url, "_blank");
          break;
      }
    });
  }
  initMovingElement(): void {
    this.titleEl = this.body.querySelector(".title-el") as HTMLInputElement;
    this.movingElement = this.titleEl;
  }
  onSelectedDrop() {
    // for (const sNode of __selection.selectedNodes) {
    //   console.log(sNode.title);
    //   sNode.moving.stepBack();
    //   const sItem = sNode.cItem.originalItem;
    //   sItem.ess.pageId = this.cItem.originalItem.ess._id;
    //   sItem.save(false);
    //   sNode.removeFromPage();
    // }
    // __selection.selectedNodes = [];
  }
  bodyInit() {
    super.bodyInit();
    this.body.classList.add("v-n-page");
    this.body.innerHTML += `<div class="btn-el btn">🔗</div>`;
  }
}
