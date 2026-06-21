import type { Page, Routes } from "./types";
import { settingsPage } from "./pages/settings";
import { newsPage } from "./pages/news/news";
import { userPage } from "./pages/user";
import { notFoundPage } from "./pages/notFound";
import { welcomePage } from "./pages/welcome/welcome";
import { registerPage } from "./pages/register/register";
import { deskPage } from "./pages/desk";
import { renderHeader } from "./components/header";
import { getUser } from "./services/auth.service";

const routes: Routes = {
  "/": deskPage,
  "/settings": settingsPage,
  "/news": newsPage,
  "/user/:id": userPage,
  "/welcome": welcomePage,
  "/register": registerPage,
  // "/desk": deskPage,
  "/desk/:id": deskPage,
};

class Router {
  currentPageUnmount?: (() => void) | undefined;
  init() {
    window.addEventListener("popstate", () => this.render());

    document.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || !a.href) return;

      const url = new URL(a.href);
      if (url.origin !== location.origin) return;

      e.preventDefault();
      this.navigate(url.pathname);
    });

    this.render();
  }
  private matchRoute(
    routes: Routes,
    path: string,
  ): { page: Page; params: Record<string, string> } {
    const exactMatch = routes[path];
    if (exactMatch) {
      return { page: exactMatch, params: {} };
    }

    for (const pattern in routes) {
      const paramNames: string[] = [];
      const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return "([^/]+)";
      });

      const match = path.match(new RegExp(`^${regexStr}$`));
      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1]!;
        });
        return { page: routes[pattern]!, params };
      }
    }

    return { page: notFoundPage, params: {} };
  }

  navigate(path: string): void {
    history.pushState({}, "", path);
    this.render();
  }

  render(): void {
    // уничтожаем текущую страницу
    this.currentPageUnmount?.();
    renderHeader();
    let path = window.location.pathname;

    if (path === "/") {
      const user = getUser();
      if (user?.settings?.homeId) {
        const targetPath = `/desk/${user.settings.homeId}`;
        history.replaceState({}, "", targetPath);
        path = targetPath;
      }
    }

    const { page, params } = this.matchRoute(routes, path);

    try {
      const main = document.querySelector("main");
      if (!main) throw new Error("Элемент main не найден в DOM");

      const { html, title, init, unmount } = page(params);
      main.innerHTML = html;
      document.title = title ?? "a-nodes";
      init?.();
      this.currentPageUnmount = unmount;
    } catch (e) {
      console.error("Ошибка роутера:", e);
    }
  }
}
export const router = new Router();
