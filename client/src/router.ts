import type { Page, Routes } from "./types";

import { homePage } from "./pages/home";
import { settingsPage } from "./pages/settings";
import { newsPage } from "./pages/news/news";
import { userPage } from "./pages/user";
import { notFoundPage } from "./pages/notFound";
import { welcomePage } from "./pages/welcome/welcome";
import { registerPage } from "./pages/register/register";
import { deskPage } from "./pages/desk";

const routes: Routes = {
  "/": homePage,
  "/settings": settingsPage,
  "/news": newsPage,
  "/user/:id": userPage,
  "/welcome": welcomePage,
  "/register": registerPage,
  "/desk": deskPage,
  "/desk/:id": deskPage, // вложенный desk — тот же компонент, другой deskId
};

function matchRoute(
  routes: Routes,
  path: string,
): { page: Page; params: Record<string, string> } {
  // Сначала ищем точное совпадение
  if (routes[path]) {
    return { page: routes[path], params: {} };
  }

  // Затем ищем по паттерну
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
        params[name] = match[i + 1];
      });
      return { page: routes[pattern], params };
    }
  }

  return { page: notFoundPage, params: {} };
}

export function render(): void {
  const path = window.location.pathname;
  const { page, params } = matchRoute(routes, path);

  try {
    const main = document.querySelector("main");
    if (!main) throw new Error("Элемент main не найден в DOM");

    const { html, title, init } = page(params);
    main.innerHTML = html;
    document.title = title ?? "a-nodes";
    init?.();
  } catch (e) {
    console.error("Ошибка роутера:", e);
  }
}
