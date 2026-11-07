import { core, EVENTS } from "@/features/core/core";
import html from "./c-nodes-menu.html?raw";
import "./c-nodes-menu.scss";
import "@/components/c-tri-toggle";
import "@/components/c-stepper";
import { StyleSection } from "./StyleSection";
import { FrameIoSection } from "./FrameIoSection";
import { PageOutSection } from "./PageOutSection";
import { UrlSection } from "./UrlSection";
import { RepeatSection } from "./RepeatSection";
import type { OptionsBlock } from "./MenuControls";

export class CNodesMenu extends HTMLElement {
  private unsubscribes: (() => void)[] = [];
  private styleSection?: StyleSection;
  private frameIoSection?: FrameIoSection;
  private pageOutSection?: PageOutSection;
  private urlSection?: UrlSection;
  private repeatSection?: RepeatSection;

  get optionsBlocks(): OptionsBlock[] {
    const blocks: OptionsBlock[] = [];
    if (this.styleSection) blocks.push(this.styleSection.block);
    if (this.frameIoSection) blocks.push(this.frameIoSection.block);
    if (this.pageOutSection) blocks.push(this.pageOutSection.block);
    if (this.urlSection) blocks.push(this.urlSection.block);
    return blocks;
  }

  connectedCallback() {
    this.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.addEventListener("pointerup", (e) => e.stopPropagation());
    this.addEventListener("click", (e) => e.stopPropagation());
    this.innerHTML = html;

    this.styleSection = new StyleSection(this);
    this.frameIoSection = new FrameIoSection(this);
    this.pageOutSection = new PageOutSection(this);
    this.urlSection = new UrlSection(this);
    this.repeatSection = new RepeatSection(this);

    this.unsubscribes.push(
      core.store.on(EVENTS.node.selected, (node) => {
        if (core.mode.selectedVNodeCount === 0) return;
        this.styleSection?.render();
        this.frameIoSection?.render(node);
        this.pageOutSection?.render(node);
        this.urlSection?.render();
        this.repeatSection?.render();
      }),
      core.store.on(EVENTS.node.unselected, (_node) => {
        this.styleSection?.hide();
        this.frameIoSection?.hide();
        this.pageOutSection?.hide();
        this.urlSection?.hide();
        this.repeatSection?.hide();
      }),
    );

    if (core.mode.selectedVNodeCount > 0) {
      this.styleSection?.render();
      this.frameIoSection?.render();
      this.pageOutSection?.render();
      this.urlSection?.render();
      this.repeatSection?.render();
    }
  }

  disconnectedCallback() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }
}

if (!customElements.get("c-nodes-menu")) {
  customElements.define("c-nodes-menu", CNodesMenu);
}

if (import.meta.hot) {
  import.meta.hot.invalidate();
}
