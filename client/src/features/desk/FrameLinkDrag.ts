import { core } from "../core/core";
import { Ge_Path } from "./DeskSVG/Ge_Path";
import type { LNode_TextEdit } from "../nodes/LNode/LNode_TextEdit";

/** протяжка линии от кнопки фрейма к другому фрейму (создание связи) */
export class FrameLinkDrag {
  private source: LNode_TextEdit | null = null;
  private path: Ge_Path | null = null;
  private target: LNode_TextEdit | null = null;

  start(source: LNode_TextEdit, e: PointerEvent) {
    if (this.source) return;
    this.source = source;
    this.target = null;
    this.path = new Ge_Path();
    this.path.element.setAttribute("stroke-dasharray", "6 4");
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("keydown", this.onKey, true);
    this.onMove(e);
  }

  private findTarget(x: number, y: number): LNode_TextEdit | null {
    const src = this.source!;
    for (const node of core.nodeManager.nodes.values()) {
      const n = node as LNode_TextEdit;
      if (!n.frame?.isFrame || n === src) continue;
      if (!src.frame.canLinkTo(n)) continue;
      const r = n.getNodeRect(true);
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
        return n;
    }
    return null;
  }

  private onMove = (e: PointerEvent) => {
    if (!this.source || !this.path) return;
    const w = core.desk.viewport.screenToWorld(e.clientX, e.clientY);
    this.target = this.findTarget(w.x, w.y);
    const sr = this.source.getNodeRect(true);
    const childPt = { x: sr.x, y: sr.y + 10 };
    if (this.target) {
      const tr = this.target.getNodeRect(true);
      this.path.setDotVisible(true);
      this.path.draw({ x: tr.x + tr.width, y: tr.y + 10 }, childPt);
    } else {
      this.path.setDotVisible(false);
      this.path.draw(w, childPt);
    }
  };

  private onUp = () => {
    const source = this.source;
    const target = this.target;
    this.finish();
    if (source && target) source.frame.linkToParent(target);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.code !== "Escape") return;
    this.target = null;
    this.finish();
  };

  private finish() {
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("keydown", this.onKey, true);
    this.path?.remove();
    this.path = null;
    this.source = null;
    this.target = null;
  }
}
