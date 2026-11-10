import { core } from "@/features/core/core";
import { OptionsBlock } from "./MenuControls";
import { NODE_TYPES } from "@/features/nodes/node-registry";
import type { LNode_Page } from "@/features/nodes/LNode/LNode_Page";
import type { CStepper } from "@/components/c-stepper";

export class PageOutSection {
  block: OptionsBlock;
  private framesListEl: HTMLElement | null;
  private stepper: CStepper | null;

  constructor(container: HTMLElement) {
    const el = container.querySelector(".page-out-block") as HTMLElement;
    this.block = new OptionsBlock(el);

    this.framesListEl = el.querySelector(".out-frames-list");
    this.stepper = el.querySelector(".out-limit-stepper") as CStepper | null;

    this.stepper?.addEventListener("focusin", () => {
      core.mode.textEditing = true;
    });
    this.stepper?.addEventListener("focusout", () => {
      core.mode.textEditing = false;
    });
    this.stepper?.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });

    this.stepper?.addEventListener("change", (e: Event) => {
      const pageNode = this.getSelectedPageNode();
      if (!pageNode) return;
      const customEv = e as CustomEvent<{ value: number }>;
      const val = customEv.detail?.value ?? this.stepper?.value ?? 10;
      pageNode.setOutLimit(val);
    });

    this.block.setRender(() => {
      this.render();
    });
  }

  private getSelectedPageNode(targetNode?: any): LNode_Page | null {
    const node =
      targetNode ?? core.selectManager.selectedNodes.values().next().value;
    if (node && node.type === NODE_TYPES.PAGE.id) {
      return node as LNode_Page;
    }
    return null;
  }

  render(targetNode?: any) {
    const pageNode = this.getSelectedPageNode(targetNode);
    if (!pageNode) {
      this.block.hide();
      return;
    }

    this.block.show();

    const outFrames = Array.isArray(pageNode.out) ? pageNode.out : [];
    if (this.framesListEl) {
      this.framesListEl.innerHTML = "";
      if (outFrames.length > 1) {
        const selectedLID = pageNode.selectedOutLID || 0;

        const allBtn = document.createElement("div");
        allBtn.className = `btn${selectedLID === 0 ? " active" : ""}`;
        allBtn.textContent = "Все";
        allBtn.addEventListener("click", () => {
          pageNode.setSelectedOutFrame(0);
          this.render(pageNode);
        });
        this.framesListEl.appendChild(allBtn);

        for (const frame of outFrames) {
          const btn = document.createElement("div");
          btn.className = `btn${selectedLID === frame.lID ? " active" : ""}`;
          btn.textContent = frame.t || (frame as any).title || `Фрейм #${frame.lID}`;
          btn.addEventListener("click", () => {
            pageNode.setSelectedOutFrame(frame.lID);
            this.render(pageNode);
          });
          this.framesListEl.appendChild(btn);
        }
      }
    }

    if (this.stepper) {
      this.stepper.value = pageNode.outLimit ?? 10;
    }
  }

  hide() {
    this.block.hide();
  }
}

