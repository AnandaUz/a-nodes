import { core } from "@/features/core/core";
import Tools from "@/features/core/Tools";
import {
  clearSelectedNodesRepeat,
  setSelectedNodesRepeatDate,
  toggleSelectedNodesRepeatDay,
  setSelectedNodesRepeatDelay,
  calcDayDelay,
} from "./nodeMenuActions";

const DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const HOT_BTNS = [
  { title: "+1", delay: 1 },
  { title: "+3", delay: 3 },
  { title: "+7", delay: 7 },
  { title: "+14", delay: 14 },
  { title: "+30", delay: 30 },
];

export class RepeatSection {
  private repeatBlock: HTMLElement;
  private inpEl: HTMLDivElement;
  private dayBtns: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.repeatBlock = container.querySelector(".repeat-block") as HTMLElement;
    this.inpEl = container.querySelector(".time-block") as HTMLDivElement;
    const daysBlock = container.querySelector(".days-block") as HTMLElement;
    const hotBtnsBlock = container.querySelector(".hot-btns") as HTMLDivElement;
    const elHotDaysBlock = container.querySelector(".el-hot-days-btns-block") as HTMLElement;
    const btnClear = container.querySelector(".btn-clear") as HTMLElement;

    btnClear.addEventListener("click", () => {
      this.inpEl.textContent = "";
      this.clearDayBtns();
      clearSelectedNodesRepeat();
    });

    const onInput = () => {
      const value = this.inpEl.textContent?.replaceAll(",", ".") || "";
      const regex = /\+(\d+)/;
      const m = value.match(regex);

      let isChanged = false;
      let repeatDay: Date | null = null;

      if (m) {
        const n = Number(m[1]);
        if (n) {
          isChanged = true;
          const d = new Date();
          d.setDate(d.getDate() + n);
          repeatDay = d;
          this.inpEl.innerHTML = Tools.formatDate(d);
        }
      } else {
        const date = Tools.parseDate(value);
        if (date) {
          this.inpEl.innerHTML = Tools.formatDate(date);
          isChanged = true;
          repeatDay = date;
        } else {
          this.inpEl.innerHTML = "";
          isChanged = true;
          repeatDay = null;
        }
      }

      if (isChanged) {
        setSelectedNodesRepeatDate(repeatDay);
        this.inpEl.blur();
      }
    };

    this.inpEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        Tools.stopEvent(e);
        onInput();
      }
    });
    this.inpEl.addEventListener("focus", () => {
      core.mode.textEditing = true;
    });
    this.inpEl.addEventListener("blur", () => {
      core.mode.textEditing = false;
      onInput();
    });

    DAYS.forEach((day, i) => {
      const el = document.createElement("div");
      el.textContent = day;
      el.classList.add("btn");
      this.dayBtns.push(el);
      daysBlock.appendChild(el);

      el.addEventListener("pointerdown", (e) => {
        Tools.stopEvent(e);
      });
      el.addEventListener("pointerup", (e) => {
        if (e.pointerType === "mouse") {
          this.clearDayBtns();
        }
        Tools.stopEvent(e);

        const isToggledOn = toggleSelectedNodesRepeatDay(i + 1);
        if (isToggledOn) {
          el.classList.toggle("active");
        }
      });
    });

    HOT_BTNS.forEach((item) => {
      const el = document.createElement("div");
      el.textContent = item.title;
      el.classList.add("btn");
      hotBtnsBlock.appendChild(el);

      el.addEventListener("pointerdown", (e) => {
        Tools.stopEvent(e);
      });
      el.addEventListener("pointerup", (e) => {
        Tools.stopEvent(e);
        setSelectedNodesRepeatDelay(item.delay);
      });
    });

    DAYS.forEach((item, i) => {
      const targetDay = i + 1;
      const el = document.createElement("div");
      el.textContent = item;
      el.classList.add("btn");
      elHotDaysBlock.appendChild(el);

      el.addEventListener("pointerdown", (e) => {
        Tools.stopEvent(e);
      });
      el.addEventListener("pointerup", (e) => {
        Tools.stopEvent(e);
        const delay = calcDayDelay(targetDay);
        setSelectedNodesRepeatDelay(delay);
      });
    });
  }

  private clearDayBtns() {
    this.dayBtns.forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  render() {
    this.repeatBlock.classList.add("active");
    this.clearDayBtns();
    this.inpEl.textContent = "";

    core.selectManager.selectedNodes.forEach((node) => {
      if (node.repeatMode.mode) {
        const idx = node.repeatMode.mode;
        if (this.dayBtns[idx - 1]) {
          this.dayBtns[idx - 1]?.classList.add("active");
        }
      }
      if (node.repeatMode.date) {
        this.inpEl.textContent = Tools.formatDate(node.repeatMode.date);
      }
    });
  }

  hide() {
    this.repeatBlock.classList.remove("active");
  }
}
