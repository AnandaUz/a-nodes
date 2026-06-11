import { core, EVENTS } from "@/features/core/core";
import html from "./c-nodes-menu.html?raw";
import "./c-nodes-menu.scss";
import Tools from "@/features/core/Tools";
class CNodesMenu extends HTMLElement {
  connectedCallback() {
    this.innerHTML = html;
    this.initRepeatBlock();
  }
  initRepeatBlock() {
    const repeatBlock = this.querySelector(".repeat-block") as HTMLElement;
    const daysBlock = this.querySelector(".days-block") as HTMLElement;

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
        el.classList.toggle("active");
        core.selectManager.selectedNodes.forEach((node) => {
          if (!node.nodeEss.exData) {
            node.nodeEss.exData = {};
          }
          node.nodeEss.exData.repeatMode = i.toString();
          core.store.emit(EVENTS.nodes.updated, node.nodeEss);
        });
      });
    });
    core.store.on(EVENTS.nodes.selected, (_node) => {
      repeatBlock.classList.add("active");
    });
    core.store.on(EVENTS.nodes.unselected, (_node) => {
      repeatBlock.classList.remove("active");
    });
  }
}

customElements.define("c-nodes-menu", CNodesMenu);
