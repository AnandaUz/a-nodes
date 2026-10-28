import { core, EVENTS } from "@/features/core/core";
import html from "./c-nodes-menu.html?raw";
import "./c-nodes-menu.scss";
import { StyleSection } from "./StyleSection";
import { UrlSection } from "./UrlSection";
import { RepeatSection } from "./RepeatSection";
import type { OptionsBlock } from "./MenuControls";

export class CNodesMenu extends HTMLElement {
  private unsubscribes: (() => void)[] = [];
  private styleSection?: StyleSection;
  private urlSection?: UrlSection;
  private repeatSection?: RepeatSection;

  get optionsBlocks(): OptionsBlock[] {
    const blocks: OptionsBlock[] = [];
    if (this.styleSection) blocks.push(this.styleSection.block);
    if (this.urlSection) blocks.push(this.urlSection.block);
    return blocks;
  }

  connectedCallback() {
    this.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.addEventListener("pointerup", (e) => e.stopPropagation());
    this.addEventListener("click", (e) => e.stopPropagation());
    this.innerHTML = html;

    this.styleSection = new StyleSection(this);
    this.urlSection = new UrlSection(this);
    this.repeatSection = new RepeatSection(this);

    this.unsubscribes.push(
      core.store.on(EVENTS.node.selected, (_node) => {
        if (core.mode.selectedVNodeCount === 0) return;
        this.styleSection?.render();
        this.urlSection?.render();
        this.repeatSection?.render();
      }),
      core.store.on(EVENTS.node.unselected, (_node) => {
        this.styleSection?.hide();
        this.urlSection?.hide();
        this.repeatSection?.hide();
      }),
    );
  }

  disconnectedCallback() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }
}

customElements.define("c-nodes-menu", CNodesMenu);
