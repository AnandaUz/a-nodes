import { CStepper } from "./c-stepper.ts";

export const COMPONENT_TAG = "c-stepper";

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, CStepper);
}

export { CStepper };

