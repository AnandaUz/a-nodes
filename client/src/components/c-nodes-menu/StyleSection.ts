import { core } from "@/features/core/core";
import { OptionsBlock, BtnGroup, type IBtnData } from "./MenuControls";
import { updateSelectedNodesEx } from "./nodeMenuActions";

export class StyleSection {
  block: OptionsBlock;
  private btnGroupColor: BtnGroup;
  private btnGroupBg: BtnGroup;
  private hGroup: BtnGroup;

  constructor(container: HTMLElement) {
    const textStyleBlock = container.querySelector(".text-style-block") as HTMLElement;
    this.block = new OptionsBlock(textStyleBlock);

    const hBlock = container.querySelector(".h-block") as HTMLDivElement;
    const hBtns: IBtnData[] = [];
    const hCount = 4;
    for (let i = 0; i < hCount; i++) {
      hBtns.push({
        text: `H${i + 1}`,
        value: `h${i + 1}`,
      });
    }

    this.hGroup = new BtnGroup(hBtns, hBlock, (value) => {
      updateSelectedNodesEx(
        (node) => {
          node.exData!.h = value || "";
        },
        { updateChildrenPosition: true },
      );
    });

    const textColor = container.querySelector(".text-color") as HTMLDivElement;
    const colorCount = 10;
    const btnDataColor: IBtnData[] = [];
    for (let i = 0; i < colorCount; i++) {
      const v = Math.round((i * 360) / colorCount);
      btnDataColor.push({
        tColor: `hsl(${v}, 70%, 50%)`,
        text: "A",
        value: `${v}`,
      });
    }

    this.btnGroupColor = new BtnGroup(btnDataColor, textColor, (value) => {
      updateSelectedNodesEx((node) => {
        node.exData!.tColor = value || "";
      });
    });

    const btnDataBg: IBtnData[] = [];
    for (let i = 0; i < colorCount; i++) {
      const v = Math.round((i * 360) / colorCount);
      btnDataBg.push({
        value: `${v}`,
        bgColor: `hsl(${v}, 70%, 90%)`,
      });
    }
    const bgColor = container.querySelector(".bg-color") as HTMLDivElement;
    this.btnGroupBg = new BtnGroup(btnDataBg, bgColor, (value) => {
      updateSelectedNodesEx((node) => {
        node.exData!.bgColor = value || "";
      });
    });

    this.block.setRender(() => {
      this.block.show();
      const firstNode = core.selectManager.selectedNodes.values().next().value;
      if (firstNode) {
        this.btnGroupColor.setActiveBtn(firstNode.exData?.tColor || "", true);
        this.btnGroupBg.setActiveBtn(firstNode.exData?.bgColor || "", true);
        this.hGroup.setActiveBtn(firstNode.exData?.h || "", true);
      }
    });
  }

  render() {
    this.block.render();
  }

  hide() {
    this.block.hide();
  }
}
