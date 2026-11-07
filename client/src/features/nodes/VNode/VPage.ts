import { router } from "@/router";
import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { breadcrumbsService } from "@/features/breadcrumbs/breadcrumbsService";

export class VPage extends VTextEdit {
  init() {
    super.init();

    const btnEl = this.body.querySelector(".btn-el") as HTMLElement;
    if (btnEl) {
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
          const deskTargetId =
            essUrl && /^[a-f0-9]{24}$/i.test(essUrl) ? essUrl : _id;
          breadcrumbsService.pushItem({
            id: deskTargetId || _id || "",
            title: this.node.title || "Доска",
          });
          router.navigate(url);
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

    const btnPutInto = this.body.querySelector(".btn-put-into") as HTMLElement;
    if (btnPutInto) {
      btnPutInto.addEventListener("pointerdown", (e) => {
        Tools.stopEvent(e);
      });
      btnPutInto.addEventListener("touchstart", (e) => {
        e.stopPropagation();
      });
    }
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
    this.body.innerHTML += `
      <div class="page-btns">
        <div class="btn-put-into btn" title="Перенести во входящие"></div>
        <div class="btn-page-in btn btn-el" title="Войти в страницу"></div>
      </div>
    `;
  }
  render() {
    super.render();
  }
}
