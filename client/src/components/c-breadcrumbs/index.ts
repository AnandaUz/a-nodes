import { CBreadcrumbs } from "./c-breadcrumbs";

export const COMPONENT_TAG = "c-breadcrumbs";

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, CBreadcrumbs);
}

export { CBreadcrumbs };

