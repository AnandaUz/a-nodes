import htmlContent from "./c-tri-toggle.html?raw";
import styleContent from "./c-tri-toggle.scss?inline";

const template = document.createElement("template");
template.innerHTML = `<style>${styleContent}</style>${htmlContent}`;

export type TriToggleItems = [string, string, string];

export interface TriToggleChangeEventDetail {
  value: string;
  index: number;
  items: TriToggleItems;
}

export class CTriToggle extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["items", "value", "selected-index"];
  }

  private isInitialized = false;
  private _items: TriToggleItems = ["in", "normal", "out"];
  private _selectedIndex = 1;
  private _value = "normal";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  get items(): TriToggleItems {
    return [...this._items];
  }

  set items(val: string[] | TriToggleItems) {
    if (!Array.isArray(val) || val.length === 0) return;
    const item0 = val[0] ?? "";
    const item1 = val[1] ?? "";
    const item2 = val[2] ?? "";
    this._items = [item0, item1, item2];
    this.syncValueFromIndex();
    this.updateDom();
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    const idx = this._items.indexOf(val);
    if (idx !== -1) {
      this._selectedIndex = idx;
      this._value = val;
    } else {
      this._value = val;
    }
    this.updateDom();
  }

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  set selectedIndex(idx: number) {
    if (idx >= 0 && idx < 3) {
      this._selectedIndex = idx;
      this.syncValueFromIndex();
      this.updateDom();
    }
  }

  connectedCallback(): void {
    if (!this.isInitialized) {
      this.render();
      this.isInitialized = true;
    }
  }

  disconnectedCallback(): void {
    // Event listeners on shadow DOM elements are cleaned up with shadow root
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.handleAttributeChange(name, newValue);
  }

  private handleAttributeChange(name: string, value: string | null): void {
    if (name === "items" && value !== null) {
      this.parseItemsAttribute(value);
    } else if (name === "value" && value !== null) {
      this.value = value;
    } else if (name === "selected-index" && value !== null) {
      const idx = parseInt(value, 10);
      if (!Number.isNaN(idx)) {
        this.selectedIndex = idx;
      }
    }
  }

  private parseItemsAttribute(raw: string): void {
    let parsed: string[] = [];
    if (raw.trim().startsWith("[") && raw.trim().endsWith("]")) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw.split(",").map((s) => s.trim());
      }
    } else {
      parsed = raw.split(",").map((s) => s.trim());
    }

    if (parsed.length >= 3) {
      this.items = [parsed[0] ?? "", parsed[1] ?? "", parsed[2] ?? ""];
    }
  }

  private syncValueFromIndex(): void {
    this._value = this._items[this._selectedIndex] ?? "";
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));

    const segments =
      this.shadowRoot.querySelectorAll<HTMLButtonElement>(".segment");
    segments.forEach((seg, index) => {
      seg.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectIndex(index, true);
      });
    });

    this.updateDom();
  }

  private selectIndex(index: number, emitEvent: boolean): void {
    if (index < 0 || index > 2) return;
    if (this._selectedIndex === index && !emitEvent) return;

    this._selectedIndex = index;
    this.syncValueFromIndex();
    this.updateDom();

    if (emitEvent) {
      const detail: TriToggleChangeEventDetail = {
        value: this._value,
        index: this._selectedIndex,
        items: [...this._items],
      };
      this.dispatchEvent(
        new CustomEvent<TriToggleChangeEventDetail>("change", {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
      this.dispatchEvent(
        new CustomEvent<TriToggleChangeEventDetail>("input", {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    }
  }

  private updateDom(): void {
    if (!this.shadowRoot) return;

    const segments =
      this.shadowRoot.querySelectorAll<HTMLButtonElement>(".segment");
    segments.forEach((seg, index) => {
      const labelEl = seg.querySelector<HTMLSpanElement>(".segment-label");
      if (labelEl) {
        labelEl.textContent = this._items[index] ?? "";
      }
      if (index === this._selectedIndex) {
        seg.classList.add("active");
        seg.setAttribute("aria-pressed", "true");
      } else {
        seg.classList.remove("active");
        seg.setAttribute("aria-pressed", "false");
      }
    });
  }
}

if (!customElements.get("c-tri-toggle")) {
  customElements.define("c-tri-toggle", CTriToggle);
}
