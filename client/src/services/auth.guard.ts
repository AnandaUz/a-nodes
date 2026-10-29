import { getToken, saveUser } from "@services/auth.service";
import api from "@features/core/api";
import { router } from "@/router";
import { renderHeader } from "@/components/header";

export function verifyTokenInBackground(): void {
  const token = getToken();
  if (!token) return;

  api
    .fetchWithAuth("/api/auth/verify")
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          saveUser(data.user);
          renderHeader();
          const path = window.location.pathname;
          const publicRoutes = ["/welcome", "/register"];
          const isPublic = publicRoutes.includes(path);
          if (!data.user.isRegistered && path !== "/register") {
            if (path !== "/" && !isPublic) {
              sessionStorage.setItem(
                "auth_redirect",
                path + window.location.search + window.location.hash,
              );
            }
            router.gotoPage_register();
          }
        }
      }
    })
    .catch((e) => {
      console.error("Ошибка проверки токена:", e);
    });
}

export function authGuard(): void {
  const token = getToken();
  const path = window.location.pathname;

  const publicRoutes = ["/welcome", "/register"];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    if (path !== "/") {
      sessionStorage.setItem(
        "auth_redirect",
        path + window.location.search + window.location.hash,
      );
    }
    history.replaceState({}, "", "/welcome");
    return;
  }

  if (token && path === "/welcome") {
    const redirectUrl = sessionStorage.getItem("auth_redirect");
    if (redirectUrl) {
      sessionStorage.removeItem("auth_redirect");
      history.replaceState({}, "", redirectUrl);
    } else {
      history.replaceState({}, "", "/");
    }
    return;
  }

  if (token) {
    verifyTokenInBackground();
  }
}
