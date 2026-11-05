import { CTriToggle } from "./c-tri-toggle.ts";

export const COMPONENT_TAG = "c-tri-toggle";

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, CTriToggle);
}

export { CTriToggle };

