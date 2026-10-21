import Tools from "@/features/core/Tools";
import { core } from "@/features/core/core";
import type { LNode_TextEdit } from "../LNode/LNode_TextEdit";
import { VNode } from "./VNode";
import type { LNode } from "../LNode/LNode";

export default class VTextEdit extends VNode {
  titleEl!: HTMLInputElement;
  isFrameMode: boolean = false;
  elListBtns?: HTMLElement | null;
  btnOpen?: HTMLElement | null;
  btnRepeats?: HTMLElement | null;
  btnHidden?: HTMLElement | null;

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

    this.elListBtns = this.body.querySelector(".el-list-btns");
    this.btnOpen = this.body.querySelector(".btn-open");
    this.btnRepeats = this.body.querySelector(".btn-repeats");
    this.btnHidden = this.body.querySelector(".btn-hidden");

    this.btnOpen?.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
      this.toggleListOpen();
    });
    this.btnRepeats?.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
      this.toggleRepeatsOpen();
    });
    this.btnHidden?.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
      this.toggleHiddenOpen();
    });
  }

  onDoubleClick(e: PointerEvent): void {
    e.preventDefault();
    super.onDoubleClick(e);
    (this.node as LNode_TextEdit).turnOn_EditTitleMode();

    const x = e.clientX;
    const y = e.clientY;

    const range = document.caretPositionFromPoint
      ? (() => {
          const pos = document.caretPositionFromPoint(x, y);
          if (!pos) return null;
          const r = document.createRange();
          r.setStart(pos.offsetNode, pos.offset);
          r.collapse(true);
          return r;
        })()
      : document.caretRangeFromPoint(x, y);

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  bodyInit() {
    super.bodyInit();
    this.body.innerHTML += `            
            <div class="el-title"></div>
            <div class="el-list-btns">            
              <div class="bt btn-open" title="Показать/скрыть список"></div>
              <div class="bt btn-repeats" title="Отложенные задачи"></div>
              <div class="bt btn-hidden" title="Спрятанные ноды"></div>             
            </div>                                     
`;
  }
  removePowerIndicators(subFrameLID: number) {
    const bl = this.body.querySelector(
      ".el-frame-power-btns .sub .line-" + subFrameLID,
    ) as HTMLElement;
    if (bl) bl.remove();

    const btn = this.body.querySelector(
      ".el-frame-power-btns .sub .btn-" + subFrameLID,
    ) as HTMLElement;
    if (btn) btn.classList.remove("active");
  }
  setRating(rating: number, subFrameLID: number) {
    const maxWidth = 100;
    const max = 15;
    const w = (max - rating) / max;
    const ww = w > 0 ? Math.round(Math.pow(w, 3) * maxWidth) : 0;

    if (ww > 0 && rating > 0) {
      const bl = this.body.querySelector(
        ".el-frame-power-btns .sub",
      ) as HTMLElement;
      if (!bl) return;

      let blRating = bl.querySelector(".rating") as HTMLElement;
      if (!blRating) {
        blRating = document.createElement("div");
        blRating.classList.add("rating");
        bl.appendChild(blRating);
      }
      let ratingLine = blRating.querySelector(
        ".rating-line.line-" + subFrameLID,
      ) as HTMLElement;
      if (!ratingLine) {
        ratingLine = document.createElement("div");
        ratingLine.classList.add("rating-line", "line-" + subFrameLID);
        blRating.appendChild(ratingLine);
      }

      ratingLine.style.setProperty("--w", ww + "px");

      // на всякий случай активирую кнопку
      const btn = this.body.querySelector(
        ".el-frame-power-btns .sub .btn-" + subFrameLID,
      ) as HTMLElement;
      if (btn) btn.classList.add("active");
    } else {
      let ratingLine = this.body.querySelector(
        ".rating-line.line-" + subFrameLID,
      ) as HTMLElement;
      if (ratingLine) ratingLine.remove();
    }
  }
  setBtnToActive(subFrameLID: number) {
    const btn = this.body.querySelector(
      ".el-frame-power-btns .sub .btn-" + subFrameLID,
    ) as HTMLElement;
    if (btn) btn.classList.add("active");
  }
  addFramePowerBtn(
    callbackOn: () => void,
    callbackOff: () => void,
    childLID: number,
  ) {
    const bt = this.body.querySelector(
      ".el-frame-power-btns .sub .btn-" + childLID,
    ) as HTMLElement;
    if (bt) return;

    let blM = this.body.querySelector(".el-frame-power-btns") as HTMLElement;
    let bl: HTMLElement;
    if (!blM) {
      blM = document.createElement("div");
      blM.classList.add("el-frame-power-btns");
      this.body.appendChild(blM);

      const blSub = document.createElement("div");
      blSub.classList.add("sub");
      blM.appendChild(blSub);
      bl = document.createElement("div");
      bl.classList.add("btns");
      blSub.appendChild(bl);
    } else {
      bl = blM.querySelector(".sub .btns") as HTMLElement;
    }
    const btn = document.createElement("div");
    btn.classList.add("btn", "btn-" + childLID);
    bl.appendChild(btn);

    btn.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
      if (btn.classList.contains("active")) {
        callbackOff();
        btn.classList.remove("active");
      } else {
        callbackOn();
        btn.classList.add("active");
      }
    });
  }
  removeFramePowerBtn() {
    this.body.querySelector(".el-frame-power-btns")?.remove();
  }
  /** удаляет кнопку включения и линию рейтинга для одного подфрейма */
  removeFramePowerBtnFor(subFrameLID: number) {
    this.body
      .querySelector(".el-frame-power-btns .sub .btn-" + subFrameLID)
      ?.remove();
    this.body
      .querySelector(
        ".el-frame-power-btns .sub .rating-line.line-" + subFrameLID,
      )
      ?.remove();
  }
  turnOn_frameMode() {
    if (this.isFrameMode) return;
    this.isFrameMode = true;
    this.body.classList.add("frame");
    const frameBlock = document.createElement("div");
    frameBlock.classList.add("el-frame-btn");
    this.body.appendChild(frameBlock);

    const btnAdd = document.createElement("div");
    btnAdd.classList.add("btn", "ico", "ico-plus");
    btnAdd.title = "Add Frame";
    frameBlock.appendChild(btnAdd);

    btnAdd.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
      (this.node as LNode_TextEdit).frame.addFrame();
    });

    const btnLink = document.createElement("div");
    btnLink.classList.add("el-frame-link");
    btnLink.title = "Связать с родителем";
    this.body.appendChild(btnLink);
    btnLink.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      Tools.stopEvent(e);
      core.desk.linkDrag.start(this.node as LNode_TextEdit, e);
    });
    this.renderSVG();
  }
  turnOff_frameMode() {
    if (!this.isFrameMode) return;
    this.isFrameMode = false;
    this.body.classList.remove("frame");
    this.body.querySelector(".el-frame-btn")?.remove();
    this.body.querySelector(".el-frame-link")?.remove();
    if (this.elFrameBg) {
      this.elFrameBg.remove();
      this.elFrameBg = null;
    }
    this.renderSVG();
  }

  set title(v: string | undefined) {
    this.node.title = v || "";
  }
  get title() {
    return this.node.title || "";
  }

  render() {
    super.render();
    const title = this.title;
    if (title) {
      const str = title.replace(/\n/g, "<br/>");
      if (str !== this.titleEl.innerHTML) {
        this.titleEl.innerHTML = str;
        // this.onChange()
      }
    }
    this.refreshListBtns();
  }

  toggleListOpen() {
    const list = this.node.list;
    list.isListOpen = !list.isListOpen;
    if (!list.isListOpen) {
      list.forEachChildren((child) => {
        child.hidden = true;
        child.vNode?.hide();
      });
    } else {
      const restoreVisibility = (parent: LNode) => {
        parent.list.children?.forEach((child) => {
          const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
          const isHidden = child.hiddenBD;

          let shouldShow = true;
          if (isRepeat && !list.isRepeatsOpen) {
            shouldShow = false;
          } else if (isHidden && !list.isHiddenOpen) {
            shouldShow = false;
          }

          if (shouldShow) {
            child.hidden = false;
            if (!child.vNode && core.nodeRenderer) {
              core.nodeRenderer.createVNode(child);
            } else {
              child.vNode?.show();
            }
            if (child.list.isListOpen) {
              restoreVisibility(child);
            }
          } else {
            child.hidden = true;
            child.vNode?.hide();
          }
        });
      };
      restoreVisibility(this.node);
    }

    const mainParent = this.node.list.mainParent || this.node;
    mainParent.list.setPositionForChildren();
    mainParent.vNode?.renderSVG();
    this.refreshListBtns();
  }

  toggleRepeatsOpen() {
    const list = this.node.list;
    list.isRepeatsOpen = !list.isRepeatsOpen;

    if (list.isRepeatsOpen) {
      if (!list.isListOpen) {
        list.isListOpen = true;
      }
      list.children?.forEach((child) => {
        if (child.repeatMode.mode > 0 || !!child.repeatMode.date) {
          child.hidden = false;
          if (!child.vNode && core.nodeRenderer) {
            core.nodeRenderer.createVNode(child);
          } else {
            child.vNode?.show();
          }
        }
      });
    } else {
      list.children?.forEach((child) => {
        if (child.repeatMode.mode > 0 || !!child.repeatMode.date) {
          child.hidden = true;
          child.vNode?.hide();
          child.list.children?.forEach((grandChild) => {
            grandChild.hidden = true;
            grandChild.vNode?.hide();
          });
        }
      });
    }

    const mainParent = this.node.list.mainParent || this.node;
    mainParent.list.setPositionForChildren();
    mainParent.vNode?.renderSVG();
    this.refreshListBtns();
  }

  toggleHiddenOpen() {
    const list = this.node.list;
    list.isHiddenOpen = !list.isHiddenOpen;

    if (list.isHiddenOpen) {
      if (!list.isListOpen) {
        list.isListOpen = true;
      }
      list.children?.forEach((child) => {
        if (child.hiddenBD) {
          child.hidden = false;
          if (!child.vNode && core.nodeRenderer) {
            core.nodeRenderer.createVNode(child);
          } else {
            child.vNode?.show();
          }
        }
      });
    } else {
      list.children?.forEach((child) => {
        if (child.hiddenBD) {
          child.hidden = true;
          child.vNode?.hide();
          child.list.children?.forEach((grandChild) => {
            grandChild.hidden = true;
            grandChild.vNode?.hide();
          });
        }
      });
    }

    const mainParent = this.node.list.mainParent || this.node;
    mainParent.list.setPositionForChildren();
    mainParent.vNode?.renderSVG();
    this.refreshListBtns();
  }

  refreshListBtns() {
    if (!this.elListBtns) return;
    const list = this.node.list;
    if (!list.hasChildren) {
      this.elListBtns.style.display = "none";
      return;
    }

    this.elListBtns.style.display = "flex";

    // 1. Серый индикатор (btn-open)
    if (this.btnOpen) {
      if (list.isListOpen) {
        this.btnOpen.classList.add("open");
      } else {
        this.btnOpen.classList.remove("open");
      }
    }

    // 2. Оранжевый индикатор (btn-repeats)
    if (this.btnRepeats) {
      const hasRepeats = list.hasRepeatChildren();
      if (!hasRepeats) {
        this.btnRepeats.style.display = "none";
      } else {
        this.btnRepeats.style.display = "";
        if (list.isRepeatsOpen) {
          this.btnRepeats.classList.add("open");
        } else {
          this.btnRepeats.classList.remove("open");
        }
      }
    }

    // 3. Синий индикатор (btn-hidden)
    if (this.btnHidden) {
      const hasHidden = list.hasHiddenChildren();
      if (!hasHidden) {
        this.btnHidden.style.display = "none";
      } else {
        this.btnHidden.style.display = "";
        if (list.isHiddenOpen) {
          this.btnHidden.classList.add("open");
        } else {
          this.btnHidden.classList.remove("open");
        }
      }
    }
  }
}
