import type { INode } from "@shared/types";
import { VNode } from "./VNode";
import { core, EVENTS } from "@features/core/core";

export default class VTextEdit extends VNode {
  //   private _title = "";
  elTitle!: HTMLInputElement;
  protected isEditMode: boolean = false;
  //   private vLine!: HTMLElement;

  constructor(node: INode, container: HTMLElement) {
    super(node, container);

    // this.nodeEss.type = NODE_TYPES.TEXT_EDIT.id

    this.bodyInit();

    this.body.addEventListener("dblclick", (e) => {
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
    });

    // this.bodyInit()
    this.elTitle = this.body.querySelector(".elTitle") as HTMLInputElement;

    this.elTitle.addEventListener("input", () => {
      const nodeEss = this.nodeEss;
      nodeEss.title = this.elTitle.innerText;

      core.store.emit(EVENTS.nodes.updated, nodeEss);
    });

    this.elTitle.addEventListener("blur", () => {
      this.turnOff_EditTitleMode();
    });

    this.render();

    // this.title = this.nodeEss.title || "";

    // this.events.onChanged.add(() => {
    //      this.threads.forEach(th => {
    //           th.reDraw()
    //      })
    // })
  }
  bodyInit() {
    super.bodyInit();
    this.body.innerHTML += `            
            <div class="elTitle"></div>        
`;
  }

  //   saveTitle(v = null) {
  //     const item = this.cItem.originalItem;
  //     item.ess.title = v ?? this.title;
  //     item.save(false);
  //   }
  set title(v: string | undefined) {
    this.nodeEss.title = v;
    this.render();
  }
  get title() {
    return this.nodeEss.title || "";
  }
  turnOf_edit_byEsc(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.turnOff_EditTitleMode();
    }
  }
  //   set isSelected(v) {
  //     super.isSelected = v;
  //     if (!v) {
  //       this.turnOff_EditTitleMode();
  //     }
  //   }
  //   text = {
  //     selectAll: () => {
  //       const selection = window.getSelection();
  //       // Очищаем предыдущее выделение
  //       selection.removeAllRanges();

  //       // Создаём новый диапазон (Range)
  //       const range = document.createRange();
  //       // Устанавливаем начало диапазона
  //       range.selectNodeContents(this.elTitle);
  //       // Добавляем диапазон в выделение
  //       selection.addRange(range);
  //     },
  //   };
  turnOn_EditTitleMode() {
    core.mode.textEditing = true; // = DESK_MODE.TEXT_EDIT
    core.mode.textNode = true;
    this.isEditMode = true;
    // this.elMove.turnOff()
    this.elTitle.contentEditable = "true";
    this.elTitle.focus();

    document.addEventListener("keydown", (e) => this.turnOf_edit_byEsc(e));
  }
  turnOff_EditTitleMode() {
    core.mode.textEditing = false; // = DESK_MODE.DEF
    core.mode.textNode = false;
    this.isEditMode = false;
    // this.elMove.turnOn()
    this.elTitle.contentEditable = "false";

    document.removeEventListener("keydown", (e) => this.turnOf_edit_byEsc(e));
  }
  render() {
    super.render();
    const title = this.title;
    if (title) {
      const str = title.replace(/\n/g, "<br/>");
      if (str !== this.elTitle.innerHTML) {
        this.elTitle.innerHTML = str;
        // this.onChange()
      }
    }
  }
}
