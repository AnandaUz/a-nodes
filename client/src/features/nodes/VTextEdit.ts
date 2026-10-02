// import VFrame from "@/features/nodes/VFrame/VFrame";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import { VNode } from "./VNode";

export default class VTextEdit extends VNode {
  titleEl!: HTMLInputElement;

  init(): void {
    super.init();
    this.titleEl = this.body.querySelector(".title-el") as HTMLInputElement;
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
            <div class="title-el"></div>                 
`;
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
  // onStop() {
  //   super.onStop();
  // }
  // select(): void {
  //   super.select();
  //   this.highlight();
  // }
  // unselect(): void {
  //   super.unselect();
  //   this.unhighlight();
  // }
  highlight() {
    this.body.classList.add("highlight");
    // if (this.subNodes.size > 0) {

    //   this.subNodes.forEach((subNode) => {
    //     subNode.body.classList.add("highlight");
    //   });
    // }
  }
  unhighlight() {
    this.body.classList.remove("highlight");
    // this.subNodes.forEach((subNode) => {
    //   subNode.body.classList.remove("highlight");
    // });
  }
}
