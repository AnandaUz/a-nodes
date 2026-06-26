import { core, EVENTS } from "@/features/core/core";
import html from "./c-nodes-menu.html?raw";
import "./c-nodes-menu.scss";
import Tools from "@/features/core/Tools";
import { VPage } from "@/features/nodes/VPage";

class OptionsBlock {
  body: HTMLElement;
  private renderFunc?: () => void;
  constructor(body: HTMLElement) {
    this.body = body;
  }
  setRender(renderFunc: () => void) {
    this.renderFunc = renderFunc;
  }
  render() {
    this.renderFunc?.();
  }
  show() {
    this.body.classList.add("active");
  }
  hide() {
    this.body.classList.remove("active");
  }
}
interface IBtnData {
  tColor?: string;
  bgColor?: string;
  text?: string;
  value?: string;
}
class BtnGroup {
  btns: Btn[] = [];
  handler?: (value: string | undefined) => void;
  isActivBtn?: Btn | null = null;
  constructor(
    data: IBtnData[],
    parent: HTMLElement,
    handler?: (value: string | undefined) => void,
  ) {
    if (handler) {
      this.handler = handler;
    }
    data.forEach((el) => {
      const btn = new Btn({
        text: el.text || "",
        handler: () => {
          if (btn) {
            if (btn === this.isActivBtn) {
              btn.active = false;
              this.isActivBtn = null;
              this.handler?.(undefined);
            } else {
              this.setActiveBtn(el.value || "");
            }
          }

          // this.handler?.(el.value || "");
        },
        parent: parent,
      });
      btn.value = el.value;
      if (el.tColor) {
        btn.el.style.color = el.tColor;
      }
      if (el.bgColor) {
        btn.el.style.backgroundColor = el.bgColor;
      }
      this.btns.push(btn);
    });
  }
  unActivAllBtn() {
    this.btns.forEach((btn) => {
      btn.active = false;
    });
  }
  setActiveBtn(value: string, onlyView: boolean = false) {
    this.unActivAllBtn();
    const btn = this.btns.find((btn) => btn.value === value);
    if (btn) {
      this.isActivBtn = btn;
      btn.active = true;
      if (onlyView) return;
      this.handler?.(value);
    }
  }
}
class Btn {
  el: HTMLElement;

  handler: () => void;
  value?: string | number | undefined;
  constructor({
    text,
    handler,
    parent,
  }: {
    text?: string;
    handler: () => void;
    parent: HTMLElement;
  }) {
    const el = document.createElement("div");
    if (text) {
      el.innerHTML = text;
    }
    el.classList.add("btn");

    this.el = el;
    parent.appendChild(el);

    this.handler = handler;
    el.addEventListener("pointerdown", (e) => {
      Tools.stopEvent(e);
    });
    el.addEventListener("pointerup", (e) => {
      Tools.stopEvent(e);
      this.handler();
    });
  }
  set active(value: boolean) {
    if (value) {
      this.el.classList.add("active");
    } else {
      this.el.classList.remove("active");
    }
  }
}
class CNodesMenu extends HTMLElement {
  private unsubcripes: (() => void)[] = [];
  optionsBlocks: OptionsBlock[] = [];
  connectedCallback() {
    this.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.addEventListener("pointerup", (e) => e.stopPropagation());
    this.addEventListener("click", (e) => e.stopPropagation());
    this.innerHTML = html;
    this.initRepeatBlock();
    this.initBlForVPage();
    this.initBlTextStyle();

    this.unsubcripes.push(
      core.store.on(EVENTS.nodes.selected, (_node) => {
        if (core.mode.selectedVNodeCount === 0) return;

        this.optionsBlocks.forEach((block) => {
          block.render();
        });
      }),
      core.store.on(EVENTS.nodes.unselected, (_node) => {
        this.optionsBlocks.forEach((block) => {
          block.hide();
        });
      }),
    );
  }
  initBlTextStyle() {
    const textStyleBlock = this.querySelector(
      ".text-style-block",
    ) as HTMLElement;
    const block = new OptionsBlock(textStyleBlock);
    this.optionsBlocks.push(block);

    const hBlock = this.querySelector(".h-block") as HTMLDivElement;
    const hBtns: IBtnData[] = [];
    const h_count = 4;
    for (let i = 0; i < h_count; i++) {
      hBtns.push({
        // tColor: `hsl(${v}, 70%, 50%)`,
        text: "H" + (i + 1),
        value: `h${i + 1}`,
      });
    }

    const HGroup = new BtnGroup(hBtns, hBlock, (value) => {
      core.selectManager.selectedNodes.forEach((node) => {
        if (!node.nodeEss.exData) {
          node.nodeEss.exData = {};
        }
        node.nodeEss.exData.h = value || "";

        node.save();
        node.render();
      });
    });

    //--- text color ---
    const textColor = this.querySelector(".text-color") as HTMLDivElement;

    const c = 10;

    const btnData: IBtnData[] = [];
    for (let i = 0; i < c; i++) {
      const v = Math.round((i * 360) / c);
      btnData.push({
        tColor: `hsl(${v}, 70%, 50%)`,
        text: "A",
        value: `${v}`,
      });
    }

    const btnGroup = new BtnGroup(btnData, textColor, (value) => {
      core.selectManager.selectedNodes.forEach((node) => {
        if (!node.nodeEss.exData) {
          node.nodeEss.exData = {};
        }
        node.nodeEss.exData.tColor = value || "";
        node.save();
        node.render();
      });
    });
    //--- bg ---//
    const btnDataBG: IBtnData[] = [];
    for (let i = 0; i < c; i++) {
      const v = Math.round((i * 360) / c);
      btnDataBG.push({
        value: `${v}`,
        bgColor: `hsl(${v}, 70%, 90%)`,
      });
    }
    const bgColor = this.querySelector(".bg-color") as HTMLDivElement;
    const btnGroupBG = new BtnGroup(btnDataBG, bgColor, (value) => {
      core.selectManager.selectedNodes.forEach((node) => {
        if (!node.nodeEss.exData) {
          node.nodeEss.exData = {};
        }
        node.nodeEss.exData.bgColor = value || "";
        node.save();
        node.render();
      });
    });

    block.setRender(() => {
      block.show();

      const firstNode = core.selectManager.selectedNodes.values().next().value;
      if (firstNode) {
        btnGroup.setActiveBtn(firstNode.nodeEss.exData?.tColor || "", true);
        btnGroupBG.setActiveBtn(firstNode.nodeEss.exData?.bgColor || "", true);
        HGroup.setActiveBtn(firstNode.nodeEss.exData?.h || "", true);
      }
    });

    //
    // const fontSize = this.querySelector(".font-size") as HTMLDivElement;
    // const fontWeight = this.querySelector(".font-weight") as HTMLDivElement;
  }
  initBlForVPage() {
    const urlBlock = this.querySelector(".url-block") as HTMLElement;
    const block = new OptionsBlock(urlBlock);
    this.optionsBlocks.push(block);
    block.setRender(() => {
      let f = true;
      let urlValue: string = "-";
      core.selectManager.selectedNodes.forEach((node) => {
        if (!(node instanceof VPage)) {
          f = false;
        } else {
          if (urlValue === "-") {
            urlValue = node.nodeEss.exData?.url || "";
          } else {
            if (urlValue !== node.nodeEss.exData?.url) {
              urlValue = "--";
            }
          }
        }
      });
      if (f) {
        block.show();
        if (urlValue !== "--") {
          url.textContent = urlValue;
        } else {
          url.textContent = "";
        }
      } else {
        block.hide();
      }
    });
    const url = this.querySelector(".url") as HTMLDivElement;

    url.addEventListener("focus", () => {
      core.mode.textEditing = true;
    });
    url.addEventListener("blur", () => {
      core.mode.textEditing = false;
      core.selectManager.selectedNodes.forEach((node) => {
        if (!node.nodeEss.exData) {
          node.nodeEss.exData = {};
        }
        node.nodeEss.exData.url = url.textContent;
        node.save();
      });
    });
  }
  initRepeatBlock() {
    const repeatBlock = this.querySelector(".repeat-block") as HTMLElement;
    const daysBlock = this.querySelector(".days-block") as HTMLElement;
    const inpEl = this.querySelector(".time-block") as HTMLDivElement;

    const onInput = () => {
      const date = Tools.parseDate(inpEl.textContent);
      if (date) {
        inpEl.innerHTML = Tools.formatDate(date);
        core.selectManager.selectedNodes.forEach((node) => {
          if (!node.nodeEss.exData) {
            node.nodeEss.exData = {};
          }
          node.nodeEss.exData.repeatDay = date;
          node.save();
          node.render();
        });
      } else {
        inpEl.innerHTML = "";
        core.selectManager.selectedNodes.forEach((node) => {
          if (!node.nodeEss.exData) {
            node.nodeEss.exData = {};
          }
          delete node.nodeEss.exData.repeatDay;
          node.save();
          node.render();
        });
      }

      inpEl.blur();
    };
    inpEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        Tools.stopEvent(e);
        onInput();
      }
    });
    inpEl.addEventListener("focus", () => {
      core.mode.textEditing = true;
    });
    inpEl.addEventListener("blur", () => {
      core.mode.textEditing = false;
      onInput();
    });
    // const clearBtn = this.querySelector(".btn-clear") as HTMLButtonElement;

    const dayBtns: HTMLElement[] = [];
    const clearBtns = () => {
      dayBtns.forEach((btn) => {
        btn.classList.remove("active");
      });
    };
    const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

    days.forEach((day, i) => {
      const el = document.createElement("div");
      el.textContent = day;
      el.classList.add("btn");
      dayBtns.push(el);
      daysBlock.appendChild(el);
      el.addEventListener("pointerdown", (e) => {
        Tools.stopEvent(e);
      });
      el.addEventListener("pointerup", (e) => {
        if (e.pointerType === "mouse") {
          clearBtns();
        }
        Tools.stopEvent(e);

        let f = true;
        core.selectManager.selectedNodes.forEach((node) => {
          if (!node.nodeEss.exData) {
            node.nodeEss.exData = {};
          }
          if (node.nodeEss.exData.repeatMode === i.toString()) {
            delete node.nodeEss.exData.repeatMode;
            f = false;
          } else {
            node.nodeEss.exData.repeatMode = i.toString();
          }
          node.save();
          node.render();
        });
        if (f) {
          el.classList.toggle("active");
        }
      });
    });

    this.unsubcripes.push(
      core.store.on(EVENTS.nodes.selected, (_node) => {
        repeatBlock.classList.add("active");
        clearBtns();
        inpEl.textContent = "";
        core.selectManager.selectedNodes.forEach((node) => {
          if (node.nodeEss.exData?.repeatMode) {
            const idx = parseInt(node.nodeEss.exData.repeatMode) || 0;
            if (dayBtns[idx]) {
              dayBtns[idx].classList.add("active");
            }
          }
          if (node.nodeEss.exData?.repeatDay) {
            inpEl.textContent = Tools.formatDate(
              new Date(node.nodeEss.exData.repeatDay),
            );
          }
        });
      }),
      core.store.on(EVENTS.nodes.unselected, (_node) => {
        repeatBlock.classList.remove("active");
      }),
    );
  }
}

customElements.define("c-nodes-menu", CNodesMenu);
