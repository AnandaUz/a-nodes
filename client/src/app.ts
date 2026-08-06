import "@styles/style.scss";
import { renderHeader } from "./components/header"; // добавить
import { renderFooter } from "./components/footer"; // добавить
import { authGuard } from "@services/auth.guard";
import { getUser, handleCredential } from "@services/auth.service";
import { Router } from "@base/client/features/router/router";
import { routes, notFoundRoute } from "@/routes.config";
import { CLoading } from "./components/loading/loading";

class RouterEx extends Router {
  override showLoader(): void {
    app.showLoader();
  }
  override hideLoader(): void {
    app.hideLoader();
  }
  checkRedirect(path: string): string {
    if (path === "/") {
      const user = getUser();
      if (user?.settings?.homeId) {
        const targetPath = `/desk/${user.settings.homeId}`;
        history.replaceState({}, "", targetPath);
        path = targetPath;
      }
    }
    return path;
  }
}
const LOADER_DELAY_MS = 150;
class App {
  router: RouterEx = new RouterEx();
  private loaderTimer: ReturnType<typeof setTimeout> | undefined;
  private loading: CLoading = new CLoading();

  constructor() {
    document.body.appendChild(this.loading);
  }
  showLoader(): void {
    this.loaderTimer = setTimeout(() => {
      this.loading.show();
    }, LOADER_DELAY_MS);
  }
  hideLoader(): void {
    clearTimeout(this.loaderTimer);
    this.loading.hide();
  }
  gotoPage_welcome() {
    history.pushState({}, "", "/welcome");
    this.router.render();
  }
  gotoPage_register() {
    history.pushState({}, "", "/register");
    this.router.render();
  }
  gotoPage_home() {
    history.pushState({}, "", "/");
    this.router.render();
  }
  async initGoogleAuth() {
    await loadGsi();
    (window as any).google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
  }

  async init() {
    this.showLoader();
    renderHeader();
    renderFooter();

    await this.initGoogleAuth();
    await authGuard();

    await this.router.init(routes, notFoundRoute);
    this.hideLoader();
  }
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export const app = new App();
app.init();
