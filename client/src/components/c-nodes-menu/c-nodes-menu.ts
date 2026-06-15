import { core, EVENTS } from "@/features/core/core";
import html from "./c-nodes-menu.html?raw";
import "./c-nodes-menu.scss";
import Tools from "@/features/core/Tools";
class CNodesMenu extends HTMLElement {
  private unsubcripes: (() => void)[] = [];
  connectedCallback() {
    this.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.addEventListener("pointerup", (e) => e.stopPropagation());
    this.addEventListener("click", (e) => e.stopPropagation());
    this.innerHTML = html;
    this.initRepeatBlock();
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
