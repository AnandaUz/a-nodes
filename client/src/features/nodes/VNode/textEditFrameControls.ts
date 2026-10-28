import Tools from "@/features/core/Tools";
import { core } from "@/features/core/core";
import type { LNode_TextEdit } from "../LNode/LNode_TextEdit";
import type VTextEdit from "./VTextEdit";

export function removePowerIndicators(view: VTextEdit, subFrameLID: number): void {
  const bl = view.body.querySelector(
    ".el-frame-power-btns .sub .line-" + subFrameLID,
  ) as HTMLElement;
  if (bl) bl.remove();

  const btn = view.body.querySelector(
    ".el-frame-power-btns .sub .btn-" + subFrameLID,
  ) as HTMLElement;
  if (btn) btn.classList.remove("active");
}

export function setRating(view: VTextEdit, rating: number, subFrameLID: number): void {
  const maxWidth = 100;
  const max = 15;
  const w = (max - rating) / max;
  const ww = w > 0 ? Math.round(Math.pow(w, 3) * maxWidth) : 0;

  if (ww > 0 && rating > 0) {
    const bl = view.body.querySelector(
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
    const btn = view.body.querySelector(
      ".el-frame-power-btns .sub .btn-" + subFrameLID,
    ) as HTMLElement;
    if (btn) btn.classList.add("active");
  } else {
    const ratingLine = view.body.querySelector(
      ".rating-line.line-" + subFrameLID,
    ) as HTMLElement;
    if (ratingLine) ratingLine.remove();
  }
}

export function setBtnToActive(view: VTextEdit, subFrameLID: number): void {
  const btn = view.body.querySelector(
    ".el-frame-power-btns .sub .btn-" + subFrameLID,
  ) as HTMLElement;
  if (btn) btn.classList.add("active");
}

export function addFramePowerBtn(
  view: VTextEdit,
  callbackOn: () => void,
  callbackOff: () => void,
  childLID: number,
): void {
  const bt = view.body.querySelector(
    ".el-frame-power-btns .sub .btn-" + childLID,
  ) as HTMLElement;
  if (bt) return;

  let blM = view.body.querySelector(".el-frame-power-btns") as HTMLElement;
  let bl: HTMLElement;
  if (!blM) {
    blM = document.createElement("div");
    blM.classList.add("el-frame-power-btns");
    view.body.appendChild(blM);

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

export function removeFramePowerBtn(view: VTextEdit): void {
  view.body.querySelector(".el-frame-power-btns")?.remove();
}

/** удаляет кнопку включения и линию рейтинга для одного подфрейма */
export function removeFramePowerBtnFor(view: VTextEdit, subFrameLID: number): void {
  view.body
    .querySelector(".el-frame-power-btns .sub .btn-" + subFrameLID)
    ?.remove();
  view.body
    .querySelector(
      ".el-frame-power-btns .sub .rating-line.line-" + subFrameLID,
    )
    ?.remove();
}

export function turnOn_frameMode(view: VTextEdit): void {
  if (view.isFrameMode) return;
  view.isFrameMode = true;
  view.body.classList.add("frame");
  const frameBlock = document.createElement("div");
  frameBlock.classList.add("el-frame-btn");
  view.body.appendChild(frameBlock);

  const btnAdd = document.createElement("div");
  btnAdd.classList.add("btn", "ico", "ico-plus");
  btnAdd.title = "Add Frame";
  frameBlock.appendChild(btnAdd);

  btnAdd.addEventListener("pointerdown", (e) => {
    Tools.stopEvent(e);
    (view.node as LNode_TextEdit).frame.addFrame();
  });

  const btnLink = document.createElement("div");
  btnLink.classList.add("el-frame-link");
  btnLink.title = "Связать с родителем";
  view.body.appendChild(btnLink);
  btnLink.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    Tools.stopEvent(e);
    core.desk.linkDrag.start(view.node as LNode_TextEdit, e);
  });
  view.renderSVG();
}

export function turnOff_frameMode(view: VTextEdit): void {
  if (!view.isFrameMode) return;
  view.isFrameMode = false;
  view.body.classList.remove("frame");
  view.body.querySelector(".el-frame-btn")?.remove();
  view.body.querySelector(".el-frame-link")?.remove();
  if (view.elFrameBg) {
    view.elFrameBg.remove();
    view.elFrameBg = null;
  }
  view.renderSVG();
}
