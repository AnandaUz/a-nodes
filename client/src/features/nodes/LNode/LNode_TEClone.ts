import { LNode } from "./LNode";
import { LNode_TextEdit } from "./LNode_TextEdit";
import VTextEditClone from "../VNode/VTextEditClone";
import { core } from "@/features/core/core";
import { escapeHtml } from "@/features/core/escapeHtml";
import type VTextEdit from "../VNode/VTextEdit";

export class LNode_TEClone extends LNode_TextEdit {
  declare vNode?: VTextEditClone;

  constructor() {
    super();

    this.list.onTotalIndexChanged((v: number) => {
      this.setRating(v);
    });
  }
  init(): void {
    super.init();
    this.forCompatibility();
  }
  setRating(v: number) {
    const vNode = this.vNode;
    if (!vNode) return;

    (this.clones.mainNode?.vNode as VTextEdit)?.setRating(
      v,
      this.list.mainParent?.lID ?? 0,
    );
  }

  setLineOfParentsTitle() {
    const vNode = this.vNode;
    if (!vNode) return;
    vNode.elLineOfParentsTitle.innerHTML = "";

    const mainNode = this.clones.mainNode;
    if (!mainNode) return;

    const getTitle = (node: LNode): string => {
      if (node instanceof LNode_TextEdit) {
        return node.clones?.sourceNode?.title || node.title || "";
      }
      return node.title || "";
    };

    const parentsTitles: string[] = [];
    let sNode: LNode = mainNode;
    let t = 10;
    while (sNode.list.parentNode) {
      sNode = sNode.list.parentNode;
      const title = getTitle(sNode);
      if (title && !parentsTitles.includes(title)) parentsTitles.push(title);
      if (t-- < 0) break;
    }

    if (parentsTitles.length === 0) {
      const mainParent = mainNode.list?.mainParent;
      if (mainParent && mainParent !== mainNode) {
        const title = getTitle(mainParent);
        if (title && !parentsTitles.includes(title)) {
          parentsTitles.push(title);
        }
      }
    }

    if (parentsTitles.length === 0) {
      const frameNode = (mainNode as LNode_TextEdit).frame?.frameNode;
      if (frameNode && frameNode !== mainNode) {
        const title = getTitle(frameNode);
        if (title && !parentsTitles.includes(title)) {
          parentsTitles.push(title);
        }
      }
    }

    if (parentsTitles.length === 0) {
      const subFrame = (this.list.parentNode ||
        this.list.mainParent) as LNode_TextEdit | null;
      if (subFrame?.frame) {
        if (subFrame.frame.parents.size > 0) {
          for (const p of subFrame.frame.parents) {
            const title = getTitle(p.node);
            if (title && !parentsTitles.includes(title)) {
              parentsTitles.push(title);
            }
          }
        }
        if (
          parentsTitles.length === 0 &&
          subFrame.frame.parentsLID.length > 0
        ) {
          for (const lid of subFrame.frame.parentsLID) {
            const pNode = core.nodeManager?.getNodeByLID(lid);
            if (pNode) {
              const title = getTitle(pNode);
              if (title && !parentsTitles.includes(title)) {
                parentsTitles.push(title);
              }
            }
          }
        }
      }
    }

    vNode.elLineOfParentsTitle.innerHTML = parentsTitles
      .map((s) => `<span>${escapeHtml(s)}</span>`)
      .join("");
  }
  onInput() {
    const vNode = this.vNode;
    // this.setTitleText(vNode.titleEl.innerText);
    const sourceNode = this.clones.sourceNode;
    if (sourceNode && vNode && sourceNode instanceof LNode_TextEdit) {
      sourceNode.setTitleText(vNode.titleEl.innerText, true, this);
      sourceNode.title = vNode.titleEl.innerText;
      sourceNode.save();
    }
  }

  getVNodeType() {
    return VTextEditClone;
  }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;

    const vNode = this.vNode;
    if (!vNode) return;
    vNode.titleEl.contentEditable = "false";

    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
    if (!this.clones.sourceNode) {
      return;
    }
    const sourceNode = this.clones.sourceNode as LNode_TextEdit;
    sourceNode.turnOff_EditTitleMode();
  }
  protected _cachedTitle: string | undefined;

  // перезаписываю родительские title getters/setters
  set title(v: string | undefined) {
    this._cachedTitle = v;
  }
  get title(): string | undefined {
    return this.clones?.sourceNode?.title ?? this._cachedTitle;
  }

  selectPost() {
    this.clones.sourceNode?.clones.doForAll((node) =>
      (node as LNode_TextEdit).highlight(),
    );
  }
  unselect() {
    super.unselect();
    this.clones.sourceNode?.clones.doForAll((node) =>
      (node as LNode_TextEdit).unhighlight(),
    );
  }
}
