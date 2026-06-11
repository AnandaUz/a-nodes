import VM_area from "./VManager/VM_area";
import { VNode } from "./VNode";
import { core, EVENTS } from "@features/core/core";

export default class VTextEdit extends VNode {
  titleEl!: HTMLInputElement;
  protected isEditMode: boolean = false;

  init(): void {
    super.init();
    this.titleEl = this.body.querySelector(".title-el") as HTMLInputElement;
    this.titleEl.addEventListener("input", () => {
      this.title = this.titleEl.innerText;
    });

    this.titleEl.addEventListener("blur", () => {
      this.turnOff_EditTitleMode();
    });
  }

  onDoubleClick(e: PointerEvent): void {
    e.preventDefault();
    super.onDoubleClick(e);
    this.turnOn_EditTitleMode();

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
    this.nodeEss.title = v || "";
  }
  get title() {
    return this.nodeEss.title || "";
  }
  turnOf_edit_byEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this.turnOff_EditTitleMode();
    }
  };
  turnOn_EditTitleMode() {
    if (core.mode.selectedVNodeCount > 1) {
      return;
    }
    core.mode.textEditing = true; // = DESK_MODE.TEXT_EDIT
    core.mode.textNode = true;
    this.isEditMode = true;
    // this.title = this.title; //так надо
    // this.elMove.turnOff()
    this.titleEl.contentEditable = "true";
    this.titleEl.focus();

    document.addEventListener("keydown", this.turnOf_edit_byEsc);
  }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false;
    core.mode.textNode = false;
    this.isEditMode = false;

    this.titleEl.contentEditable = "false";

    core.store.emit(EVENTS.nodes.updated, this.nodeEss);

    document.removeEventListener("keydown", this.turnOf_edit_byEsc);
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
  onStop() {
    if (this instanceof VM_area) return;
    const selectedVNodes = core.selectManager.selectedNodes;

    if (selectedVNodes.size > 1) {
    }
    const isMulti = selectedVNodes.size > 1;

    const putBlocks: VNode[] = isMulti ? [...selectedVNodes.values()] : [this];
    // const exNodes: VNode[] = [...putBlocks];

    const baseRect = isMulti
      ? core.selectManager.getSelectedNodeRect()
      : this.body.getBoundingClientRect();

    const overRect = {
      x: baseRect.x,
      y: baseRect.y,
      width: baseRect.width,
      height: 2, //baseRect.height,
    } as DOMRect;

    // const candidates = core.selectManager
    //   .getNodeOverRect(overRect)
    //   .filter((node) => !exNodes.includes(node) && node !== this);

    // if (!candidates.length) return;

    // // сначала ищем по тонкой полосе, потом первый попавшийся
    // const rectIn = { ...overRect, height: 5 };
    // const byNode =
    //   candidates.find((node) => node.checkInRect(rectIn)) ?? candidates[0];

    const byNode = core.selectManager.getNodeOverRect(overRect)?.[0];

    if (!byNode) return;
    if (byNode instanceof VM_area) return;

    // exNodes.push(byNode);

    const y0 = overRect.y;
    const byNodeRect = byNode.body.getBoundingClientRect();
    const y1 = byNodeRect.y;

    // if (y0 + overRect.height - y1 > byNodeRect.height * 0.5) {
    const dy0 = y1 + byNodeRect.height - y0;

    // console.log(y1, y0, y1 - y0, byNodeRect.height, dy0);
    putBlocks.forEach((node) => {
      node.moveAniTo(null, node.y + dy0);
    });

    overRect.y += dy0 - 1;

    // core.nodeRenderer.moveOverNodes(baseRect, baseRect.height, exNodes);
    // } else {
    //   this.moveAniTo(null, byNode.y - this.body.offsetHeight);
    // }
  }
}
