import { app } from "@/app";
import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";

export class VPage extends VTextEdit {
  init() {
    super.init();

    const btnEl = this.body.querySelector(".btn-el") as HTMLElement;
    if (!btnEl) return;

    btnEl.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
    });
    btnEl.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });

    const navigateToPage = (openInNewTab: boolean) => {
      const _id = this.node._id;
      let url = "";
      const essUrl = this.node.exData?.url;
      if (essUrl) {
        if (/^[a-f0-9]{24}$/i.test(essUrl)) {
          url = "/desk/" + essUrl;
        } else {
          url = essUrl;
        }
      } else {
        url = "/desk/" + _id;
      }

      if (openInNewTab) {
        window.open(url, "_blank");
      } else {
        app.router.navigate(url);
      }
    };

    btnEl.addEventListener("pointerup", (e) => {
      Tools.stopEvent(e);
      if (
        core.mode.isPinching ||
        Date.now() - core.mode.lastPinchEndTime < 300
      ) {
        return;
      }

      switch (e.button) {
        case 0:
          navigateToPage(false);
          break;
        case 1:
          navigateToPage(true);
          break;
      }
    });

    btnEl.addEventListener("click", (e) => {
      Tools.stopEvent(e);
      if (
        core.mode.isPinching ||
        Date.now() - core.mode.lastPinchEndTime < 300
      ) {
        return;
      }
      navigateToPage(false);
    });
  }
  initMovingElement(): void {
    this.titleEl = this.body.querySelector(".el-title") as HTMLInputElement;
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
