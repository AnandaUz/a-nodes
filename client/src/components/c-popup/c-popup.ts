import "./c-popup.scss";

export class CPopup extends HTMLElement {
  targetElement: HTMLElement | null = null;
  private _onOutsideClick = (e: PointerEvent) => {
    if (!this.contains(e.target as Node)) this.close();
  };
  onOpen: (owner: any) => void = () => {};
  onClose: (owner: any) => void = () => {};

  open(anchor?: HTMLElement) {
    this.setAttribute("open", "");

    if (!this.parentElement) {
      document.body.appendChild(this);
    }

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      let y = rect.bottom + 6;
      let x = rect.left;

      if (x + this.offsetWidth > window.innerWidth)
        x = window.innerWidth - this.offsetWidth;
      if (y + this.offsetHeight > window.innerHeight)
        y = window.innerHeight - this.offsetHeight;
      this.style.top = `${y}px`;
      this.style.left = `${x}px`;
    }
    this.onOpen(this.targetElement);

    setTimeout(
      () => document.addEventListener("click", this._onOutsideClick),
      0,
    );
  }

  close() {
    this.removeAttribute("open");
    document.removeEventListener("click", this._onOutsideClick);
  }

  toggle(anchor?: HTMLElement, targetElement: any = null) {
    if (targetElement) {
      this.targetElement = targetElement;
    }
    this.hasAttribute("open") ? this.close() : this.open(anchor);
  }
  connectedCallback() {
    this.classList.add("c-popup");
  }
}

customElements.define("c-popup", CPopup);
