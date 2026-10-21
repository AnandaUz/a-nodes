import Tools from "@/features/core/Tools";
import { core } from "@/features/core/core";
import type { LNode_TextEdit } from "../LNode/LNode_TextEdit";
import { VNode } from "./VNode";
import type { LNode } from "../LNode/LNode";

export default class VTextEdit extends VNode {
  titleEl!: HTMLInputElement;
  isFrameMode: boolean = false;

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
            <!--            
            <div class="el-list-btns">            
              <div class="bt btn-open"></div>
              <div class="bt btn-repeats"></div>
              <div class="bt btn-hidden"></div>             
            </div>      
             -->                                   
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
  }
}
