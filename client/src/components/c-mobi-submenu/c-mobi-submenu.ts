import "./c-mobi-submenu.scss";
import html from "./c-mobi-submenu.html?raw";
import Tools from "@/features/core/Tools";
import { core } from "@/features/core/core";

class Btn {
  private el: HTMLElement;
  private onPointerDownCb: () => void;
  private onPointerUpCb: () => void;

  private handleDown = (e: PointerEvent) => {
    Tools.stopEvent(e);
    this.el.setPointerCapture(e.pointerId); // держим события за элементом
    this.setActive();
  };

  private handleUp = (_e: PointerEvent) => {
    this.release();
  };

  constructor(
    el: HTMLElement,
    onPointerDown: () => void,
    onPointerUp: () => void,
  ) {
    this.el = el;
    this.onPointerDownCb = onPointerDown;
    this.onPointerUpCb = onPointerUp;

    // критично: без этого браузер может "съесть" pointerup как жест-скролл
    this.el.style.touchAction = "none";

    el.addEventListener("pointerdown", this.handleDown);
    el.addEventListener("pointerup", this.handleUp);
    el.addEventListener("pointercancel", this.handleUp); // главный фикс
  }

  setActive() {
    this.el.classList.add("active");
    this.onPointerDownCb();
  }

  release() {
    this.el.classList.remove("active");
    this.onPointerUpCb();
  }

  unmount() {
    this.el.removeEventListener("pointerdown", this.handleDown);
    this.el.removeEventListener("pointerup", this.handleUp);
    this.el.removeEventListener("pointercancel", this.handleUp);
  }
}

export class CMobiSubmenu extends HTMLElement {
  connectedCallback() {
    this.innerHTML = html;
    this.classList.add("c-mobi-submenu");

    const btnAddNode = this.querySelector(".add-node") as HTMLElement;
    const btnSelectMode = this.querySelector(".select-mode") as HTMLElement;
    const btnNavigationMode = this.querySelector(
      ".navigation-mode",
    ) as HTMLElement;

    new Btn(
      btnAddNode,
      () => {
        console.log("add-node");
      },
      () => {
        console.log("add-node up");
      },
    );
    new Btn(
      btnSelectMode,
      () => {
        console.log("select-mode");
      },
      () => {
        console.log("select-mode up");
      },
    );
    const btn_navigation = new Btn(
      btnNavigationMode,
      () => {
        core.mode.mobile_mode.navigation = true;
      },
      () => {
        core.mode.mobile_mode.navigation = false;
      },
    );
    btn_navigation.setActive();
  }
}

customElements.define("c-mobi-submenu", CMobiSubmenu);
