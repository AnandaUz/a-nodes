import htmlContent from "./c-stepper.html?raw";
import styleContent from "./c-stepper.scss?inline";

const template = document.createElement("template");
template.innerHTML = `<style>${styleContent}</style>${htmlContent}`;

export interface StepperChangeEventDetail {
  value: number;
  oldValue: number;
}

export interface StepperInputEventDetail {
  value: number;
}

export class CStepper extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "min", "max", "step", "disabled", "label"];
  }

  private isInitialized = false;

  private _value = 10;
  private _min = 0;
  private _max = Infinity;
  private _step = 1;
  private _disabled = false;
  private _label = "";

  private inputEl: HTMLInputElement | null = null;
  private decrementBtn: HTMLButtonElement | null = null;
  private incrementBtn: HTMLButtonElement | null = null;
  private labelEl: HTMLLabelElement | null = null;

  private repeatTimeoutId: number | null = null;
  private repeatIntervalId: number | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  get value(): number {
    return this._value;
  }

  set value(val: number) {
    this.setValue(val, false);
  }

  get min(): number {
    return this._min;
  }

  set min(val: number) {
    this._min = Number.isFinite(val) ? val : -Infinity;
    if (this._value < this._min) {
      this.setValue(this._min, true);
    } else {
      this.updateDom();
    }
  }

  get max(): number {
    return this._max;
  }

  set max(val: number) {
    this._max = Number.isFinite(val) ? val : Infinity;
    if (this._value > this._max) {
      this.setValue(this._max, true);
    } else {
      this.updateDom();
    }
  }

  get step(): number {
    return this._step;
  }

  set step(val: number) {
    this._step = Number.isFinite(val) && val > 0 ? val : 1;
  }

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(val: boolean) {
    this._disabled = Boolean(val);
    if (this._disabled) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
    this.updateDom();
  }

  get label(): string {
    return this._label;
  }

  set label(val: string) {
    this._label = val;
    this.updateLabel();
  }

  connectedCallback(): void {
    if (!this.isInitialized) {
      this.render();
      this.setupListeners();
      this.isInitialized = true;
    }
    this.updateDom();
  }

  disconnectedCallback(): void {
    this.stopRepeat();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    switch (name) {
      case "value": {
        const parsed = parseFloat(newValue ?? "");
        if (!Number.isNaN(parsed) && parsed !== this._value) {
          this.setValue(parsed, false);
        }
        break;
      }
      case "min": {
        const parsed = parseFloat(newValue ?? "");
        this._min = Number.isNaN(parsed) ? -Infinity : parsed;
        this.updateDom();
        break;
      }
      case "max": {
        const parsed = parseFloat(newValue ?? "");
        this._max = Number.isNaN(parsed) ? Infinity : parsed;
        this.updateDom();
        break;
      }
      case "step": {
        const parsed = parseFloat(newValue ?? "");
        this._step = Number.isNaN(parsed) || parsed <= 0 ? 1 : parsed;
        break;
      }
      case "disabled": {
        this._disabled = newValue !== null;
        this.updateDom();
        break;
      }
      case "label": {
        this._label = newValue ?? "";
        this.updateLabel();
        break;
      }
    }
  }

  public stepUp(multiplier = 1): void {
    if (this._disabled) return;
    this.setValue(this._value + this._step * multiplier, true);
  }

  public stepDown(multiplier = 1): void {
    if (this._disabled) return;
    this.setValue(this._value - this._step * multiplier, true);
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));

    this.inputEl = this.shadowRoot.querySelector(".stepper-value");
    this.decrementBtn = this.shadowRoot.querySelector(".btn-decrement");
    this.incrementBtn = this.shadowRoot.querySelector(".btn-increment");
    this.labelEl = this.shadowRoot.querySelector(".stepper-label");
  }

  private setupListeners(): void {
    if (!this.decrementBtn || !this.incrementBtn || !this.inputEl) return;

    this.bindRepeat(this.decrementBtn, () => this.stepDown());
    this.bindRepeat(this.incrementBtn, () => this.stepUp());

    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (this._disabled) return;

      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        this.stepUp();
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        this.stepDown();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        this.stepUp(10);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        this.stepDown(10);
      } else if (e.key === "Home" && Number.isFinite(this._min)) {
        e.preventDefault();
        this.setValue(this._min, true);
      } else if (e.key === "End" && Number.isFinite(this._max)) {
        e.preventDefault();
        this.setValue(this._max, true);
      } else if (e.key === "Enter") {
        this.commitInputValue();
        this.inputEl?.blur();
      }
    });

    this.inputEl.addEventListener("blur", () => {
      this.commitInputValue();
    });

    if (this.labelEl) {
      this.labelEl.addEventListener("click", () => {
        if (!this._disabled) {
          this.inputEl?.focus();
          this.inputEl?.select();
        }
      });
    }
  }

  private bindRepeat(btn: HTMLButtonElement, action: () => void): void {
    const start = (e: PointerEvent): void => {
      if (this._disabled || e.button !== 0) return;
      action();

      this.stopRepeat();
      this.repeatTimeoutId = window.setTimeout(() => {
        this.repeatIntervalId = window.setInterval(() => {
          action();
        }, 60);
      }, 400);
    };

    const stop = (): void => {
      this.stopRepeat();
    };

    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("pointerleave", stop);
  }

  private stopRepeat(): void {
    if (this.repeatTimeoutId !== null) {
      window.clearTimeout(this.repeatTimeoutId);
      this.repeatTimeoutId = null;
    }
    if (this.repeatIntervalId !== null) {
      window.clearInterval(this.repeatIntervalId);
      this.repeatIntervalId = null;
    }
  }

  private commitInputValue(): void {
    if (!this.inputEl) return;
    const parsed = parseFloat(this.inputEl.value.replace(",", "."));
    if (Number.isNaN(parsed)) {
      this.inputEl.value = String(this._value);
    } else {
      this.setValue(parsed, true);
    }
  }

  private setValue(val: number, dispatchEvents: boolean): void {
    const clamped = this.clamp(val);
    const oldValue = this._value;

    if (clamped === oldValue && this.inputEl?.value === String(clamped)) {
      return;
    }

    this._value = clamped;
    this.updateDom();

    if (dispatchEvents && clamped !== oldValue) {
      this.dispatchEvent(
        new CustomEvent<StepperInputEventDetail>("input", {
          bubbles: true,
          composed: true,
          detail: { value: clamped }
        })
      );
      this.dispatchEvent(
        new CustomEvent<StepperChangeEventDetail>("change", {
          bubbles: true,
          composed: true,
          detail: { value: clamped, oldValue }
        })
      );
    }
  }

  private clamp(val: number): number {
    let result = Math.min(Math.max(val, this._min), this._max);
    // Align to step precision if step is decimal
    const stepDecimals = (this._step.toString().split(".")[1] || "").length;
    if (stepDecimals > 0) {
      result = parseFloat(result.toFixed(stepDecimals));
    }
    return result;
  }

  private updateDom(): void {
    if (!this.inputEl) return;

    this.inputEl.value = String(this._value);
    this.inputEl.disabled = this._disabled;
    this.inputEl.setAttribute("aria-valuenow", String(this._value));
    this.inputEl.setAttribute("aria-valuemin", Number.isFinite(this._min) ? String(this._min) : "");
    this.inputEl.setAttribute("aria-valuemax", Number.isFinite(this._max) ? String(this._max) : "");

    if (this.decrementBtn) {
      this.decrementBtn.disabled = this._disabled || this._value <= this._min;
    }
    if (this.incrementBtn) {
      this.incrementBtn.disabled = this._disabled || this._value >= this._max;
    }
  }

  private updateLabel(): void {
    if (!this.labelEl) return;
    const slot = this.labelEl.querySelector("slot");
    if (slot && this._label) {
      slot.textContent = this._label;
    }
  }
}

