import Tools from "@/features/core/Tools";

export class OptionsBlock {
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

export interface IBtnData {
  tColor?: string;
  bgColor?: string;
  text?: string;
  value?: string;
}

export class BtnGroup {
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
          if (btn === this.isActivBtn) {
            btn.active = false;
            this.isActivBtn = null;
            this.handler?.(undefined);
          } else {
            this.setActiveBtn(el.value || "");
          }
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
    this.isActivBtn = null;
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

export class Btn {
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
