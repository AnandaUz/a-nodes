import "@styles/style.scss";
import { renderHeader } from "./components/header";
import { renderFooter } from "./components/footer";
import { authGuard } from "@services/auth.guard";
import { router } from "@/router";
import { routes, notFoundRoute } from "@/routes.config";
import { CLoading } from "./components/loading/loading";
import { registerNodeType, NODE_TYPES } from "@features/nodes/node-registry";
import { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import { LNode_Page } from "@features/nodes/LNode/LNode_Page";

registerNodeType(NODE_TYPES.TEXT_EDIT.id, LNode_TextEdit);
registerNodeType(NODE_TYPES.TEXT_EDIT_CLONE.id, LNode_TEClone);
registerNodeType(NODE_TYPES.PAGE.id, LNode_Page);

const LOADER_DELAY_MS = 150;
class App {
  router = router;
  private loaderTimer: ReturnType<typeof setTimeout> | undefined;
  private loading: CLoading = new CLoading();
  private loaderCount = 0;

  constructor() {
    document.body.appendChild(this.loading);
    window.addEventListener("loader:show", () => this.showLoader());
    window.addEventListener("loader:hide", () => this.hideLoader());
  }
  showLoader(): void {
    this.loaderCount++;
    if (!this.loaderTimer) {
      this.loaderTimer = setTimeout(() => {
        this.loading.show();
      }, LOADER_DELAY_MS);
    }
  }
  hideLoader(): void {
    this.loaderCount = Math.max(0, this.loaderCount - 1);
    if (this.loaderCount === 0) {
      if (this.loaderTimer) {
        clearTimeout(this.loaderTimer);
        this.loaderTimer = undefined;
      }
      this.loading.hide();
    }
  }
  gotoPage_welcome() {
    this.router.gotoPage_welcome();
  }
  gotoPage_register() {
    this.router.gotoPage_register();
  }
  gotoPage_home() {
    this.router.gotoPage_home();
  }
  gotoRedirectOrHome() {
    this.router.gotoRedirectOrHome();
  }
  async init() {
    this.showLoader();
    renderHeader();
    renderFooter();

    authGuard();

    await this.router.init(routes, notFoundRoute);
    this.hideLoader();
  }
}

export const app = new App();
if (!import.meta.env.TEST) {
  app.init();
}
