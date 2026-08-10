import type { RouteConfig } from "@base/client/features/router/types";

export const routes: RouteConfig[] = [
  {
    path: "/",
    load: () => import("./pages/desk/desk").then((m) => m.deskPage),
    title: "a-nodes",
  },
  {
    path: "/desk/:id",
    load: () => import("./pages/desk/desk").then((m) => m.deskPage),
    title: "a-nodes",
  },
  {
    path: "/settings",
    load: () => import("./pages/settings").then((m) => m.settingsPage),
    title: "Настройки",
  },
  {
    path: "/news",
    load: () => import("./pages/news/news").then((m) => m.newsPage),
    title: "Новости",
  },
  {
    path: "/user/:id",
    load: () => import("./pages/user").then((m) => m.userPage),
    title: (params) => `Пользователь ${params.id}`,
  },
  {
    path: "/welcome",
    load: () => import("./pages/welcome/welcome").then((m) => m.welcomePage),
    title: "Добро пожаловать",
  },
  {
    path: "/register",
    load: () => import("./pages/register/register").then((m) => m.registerPage),
    title: "Регистрация",
  },
  {
    path: "/test",
    load: () => import("./pages/test/test").then((m) => m.testPage),
    title: "Тест",
  },
];

export const notFoundRoute: RouteConfig = {
  path: "*",
  load: () => import("./pages/notFound").then((m) => m.notFoundPage),
  title: "Страница не найдена",
};
