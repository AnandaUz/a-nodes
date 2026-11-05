import { core } from "@/features/core/core";
import { OptionsBlock } from "./MenuControls";
import type { FrameIoMode } from "@/features/nodes/LNode/TFrame";
import type { CTriToggle } from "@/components/c-tri-toggle";

export class FrameIoSection {
  block: OptionsBlock;
  private triToggle: CTriToggle | null = null;

  constructor(container: HTMLElement) {
    const frameIoBlock = container.querySelector(
      ".frame-io-block",
    ) as HTMLElement;
    this.block = new OptionsBlock(frameIoBlock);

    this.triToggle = container.querySelector(
      ".frame-io-switch",
    ) as CTriToggle | null;

    this.triToggle?.addEventListener("change", (e: Event) => {
      const customEv = e as CustomEvent<{ value: string }>;
      const mode = (customEv.detail?.value ||
        this.triToggle?.value ||
        "normal") as FrameIoMode;
      const selected = Array.from(core.selectManager.selectedNodes);
      for (const node of selected) {
        const frame = (node as any).frame;
        if (frame?.isFrame) {
          frame.setIoMode(mode);
        }
      }
    });

    this.block.setRender(() => {
      this.render();
    });
  }

  render(targetNode?: any) {
    const node = targetNode ?? core.selectManager.selectedNodes.values().next().value;
    if (node?.frame?.isFrame) {
      this.block.show();
      const mode: FrameIoMode = node.frame.ioMode || "normal";
      if (this.triToggle) {
        this.triToggle.value = mode;
      }
    } else {
      this.block.hide();
    }
  }

  hide() {
    this.block.hide();
  }
}
