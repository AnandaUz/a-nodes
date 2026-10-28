import { Router } from "@base/client/features/router/router";
import { getToken, getUser } from "@/services/auth.service";
import api from "@/features/core/api";

export class AppRouter extends Router {
  override async render(): Promise<void> {
    await super.render();
    if (getToken()) {
      api.fetchWithAuth("/api/users/pageview", { method: "POST" }).catch(() => {});
    }
  }

  override checkRedirect(path: string): string {
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

  gotoPage_welcome(): void {
    this.navigate("/welcome");
  }

  gotoPage_register(): void {
    this.navigate("/register");
  }

  gotoPage_home(): void {
    this.navigate("/");
  }

  gotoRedirectOrHome(): void {
    const redirectUrl = sessionStorage.getItem("auth_redirect");
    if (redirectUrl) {
      sessionStorage.removeItem("auth_redirect");
      this.navigate(redirectUrl);
    } else {
      this.gotoPage_home();
    }
  }
}

export const router = new AppRouter();

if (typeof window !== "undefined") {
  window.addEventListener("auth:logout", () => {
    router.gotoPage_welcome();
  });

  window.addEventListener("auth:login", (e: Event) => {
    const customEvent = e as CustomEvent<{ isNew?: boolean; user?: { isRegistered?: boolean } }>;
    const detail = customEvent.detail;
    if (detail?.isNew || !detail?.user?.isRegistered) {
      router.gotoPage_register();
    } else {
      router.gotoRedirectOrHome();
    }
  });
}
