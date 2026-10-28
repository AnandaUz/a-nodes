import { core } from "@/features/core/core";
import { OptionsBlock } from "./MenuControls";
import { updateSelectedNodesEx } from "./nodeMenuActions";

export class UrlSection {
  block: OptionsBlock;

  constructor(container: HTMLElement) {
    const urlBlock = container.querySelector(".url-block") as HTMLElement;
    this.block = new OptionsBlock(urlBlock);

    const url = container.querySelector(".url") as HTMLDivElement;

    this.block.setRender(() => {
      let isVisible = true;
      let urlValue: string = "-";

      core.selectManager.selectedNodes.forEach((node) => {
        if (!node.vNode) {
          isVisible = false;
        } else {
          if (urlValue === "-") {
            urlValue = node.exData?.url || "";
          } else if (urlValue !== node.exData?.url) {
            urlValue = "--";
          }
        }
      });

      if (isVisible) {
        this.block.show();
        url.textContent = urlValue !== "--" ? urlValue : "";
      } else {
        this.block.hide();
      }
    });

    url.addEventListener("focus", () => {
      core.mode.textEditing = true;
    });

    url.addEventListener("blur", () => {
      core.mode.textEditing = false;
      updateSelectedNodesEx(
        (node) => {
          node.exData!.url = url.textContent || "";
        },
        { renderVNode: false },
      );
    });
  }

  render() {
    this.block.render();
  }

  hide() {
    this.block.hide();
  }
}
