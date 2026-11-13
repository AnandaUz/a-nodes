import Tools from "@/features/core/Tools";
import { escapeHtml } from "@/features/core/escapeHtml";
import type { LNode_TextEdit } from "../LNode/LNode_TextEdit";
import { VNode } from "./VNode";
import type { LNode } from "../LNode/LNode";
import { setCaretFromPoint } from "./textEditSelection";
import {
  addFramePowerBtn,
  removeFramePowerBtn,
  removeFramePowerBtnFor,
  removePowerIndicators,
  setBtnToActive,
  setRating,
  turnOff_frameMode,
  turnOn_frameMode,
} from "./textEditFrameControls";
import {
  refreshListBtns,
  toggleHiddenOpen,
  toggleListOpen,
  toggleRepeatsOpen,
} from "./textEditListVisibility";

export default class VTextEdit extends VNode {
  titleEl!: HTMLInputElement;
  isFrameMode: boolean = false;
  elListBtns?: HTMLElement | null;
  btnOpen?: HTMLElement | null;
  btnRepeats?: HTMLElement | null;
  btnHidden?: HTMLElement | null;
  dividerEl: HTMLElement | null = null;

  constructor(node: LNode, container: HTMLElement) {
    super(node, container);
    this.body.classList.add("text-edit");
  }

  init(): void {
    super.init();
    this.titleEl = this.body.querySelector(".el-title") as HTMLInputElement;
    this.titleEl.addEventListener("input", () => {
      (this.node as LNode_TextEdit).onInput();
    });

    this.titleEl.addEventListener("blur", () => {
      (this.node as LNode_TextEdit).turnOff_EditTitleMode();
    });
  }

  ensureListBtns(): void {
    if (this.elListBtns) return;

    const el = document.createElement("div");
    el.className = "el-list-btns";
    el.innerHTML = `            
      <div class="bt btn-open" title="Показать/скрыть список"></div>
      <div class="bt btn-repeats" title="Отложенные задачи"></div>
      <div class="bt btn-hidden" title="Спрятанные ноды"></div>             
    `;

    this.btnOpen = el.querySelector(".btn-open");
    this.btnRepeats = el.querySelector(".btn-repeats");
    this.btnHidden = el.querySelector(".btn-hidden");

    this.btnOpen?.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      Tools.stopEvent(e);
      this.toggleListOpen();
    });
    this.btnRepeats?.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      Tools.stopEvent(e);
      this.toggleRepeatsOpen();
    });
    this.btnHidden?.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      Tools.stopEvent(e);
      this.toggleHiddenOpen();
    });

    this.body.appendChild(el);
    this.elListBtns = el;
  }

  removeListBtns(): void {
    if (!this.elListBtns) return;
    this.elListBtns.remove();
    this.elListBtns = null;
    this.btnOpen = null;
    this.btnRepeats = null;
    this.btnHidden = null;
  }

  onDoubleClick(e: PointerEvent): void {
    if (this.node.isOutGroupHeader) return;
    e.preventDefault();
    super.onDoubleClick(e);
    (this.node as LNode_TextEdit).turnOn_EditTitleMode();
    setCaretFromPoint(e.clientX, e.clientY);
  }

  bodyInit() {
    super.bodyInit();
    this.body.innerHTML += `            
            <div class="el-title"></div>                                   
`;
  }

  removePowerIndicators(subFrameLID: number) {
    removePowerIndicators(this, subFrameLID);
  }

  setRating(rating: number, subFrameLID: number) {
    setRating(this, rating, subFrameLID);
  }

  setBtnToActive(subFrameLID: number) {
    setBtnToActive(this, subFrameLID);
  }

  addFramePowerBtn(
    callbackOn: () => void,
    callbackOff: () => void,
    childLID: number,
  ) {
    addFramePowerBtn(this, callbackOn, callbackOff, childLID);
  }

  removeFramePowerBtn() {
    removeFramePowerBtn(this);
  }

  /** удаляет кнопку включения и линию рейтинга для одного подфрейма */
  removeFramePowerBtnFor(subFrameLID: number) {
    removeFramePowerBtnFor(this, subFrameLID);
  }

  turnOn_frameMode() {
    turnOn_frameMode(this);
  }

  turnOff_frameMode() {
    turnOff_frameMode(this);
  }

  set title(v: string | undefined) {
    this.node.title = v || "";
  }

  get title() {
    return this.node.title || "";
  }

  render(measure = true) {
    super.render(false);
    const title = this.title;
    if (title) {
      const str = escapeHtml(title).replace(/\n/g, "<br/>");
      if (str !== this.titleEl.innerHTML) {
        this.titleEl.innerHTML = str;
      }
    }
    this.refreshListBtns();
    const isDivider = Boolean(this.node.isDivider);
    this.body.classList.toggle("is-divider", isDivider);
    if (isDivider) {
      if (!this.dividerEl) {
        this.dividerEl = document.createElement("div");
        this.dividerEl.className = "el-divider";
        this.body.appendChild(this.dividerEl);
      }
    } else if (this.dividerEl) {
      this.dividerEl.remove();
      this.dividerEl = null;
    }
    this.body.classList.toggle("out-group-header", Boolean(this.node.isOutGroupHeader));
    (this.node as LNode_TextEdit).frame?.updateIoClasses();
    if (measure) {
      this.refreshBodyRect();
    }
  }

  toggleListOpen() {
    toggleListOpen(this);
  }

  toggleRepeatsOpen() {
    toggleRepeatsOpen(this);
  }

  toggleHiddenOpen() {
    toggleHiddenOpen(this);
  }

  refreshListBtns() {
    refreshListBtns(this);
  }

  remove(): void {
    if (this.dividerEl) {
      this.dividerEl.remove();
      this.dividerEl = null;
    }
    this.removeListBtns();
    removeFramePowerBtn(this);
    super.remove();
  }
}
