import { getToken, saveUser } from "@services/auth.service";
import api from "@features/core/api";
import { router } from "@/router";
import { renderHeader } from "@/components/header";

export async function authGuard(): Promise<void> {
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
    router.gotoPage_welcome();
    return;
  }

  if (token && path === "/welcome") {
    router.gotoRedirectOrHome();
    return;
  }

  if (token) {
    try {
      const res = await api.fetchWithAuth("/api/auth/verify");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          saveUser(data.user);
          renderHeader();
          if (!data.user.isRegistered && path !== "/register") {
            if (path !== "/" && !isPublic) {
              sessionStorage.setItem(
                "auth_redirect",
                path + window.location.search + window.location.hash,
              );
            }
            router.gotoPage_register();
            return;
          }
        }
      }
    } catch (e) {
      console.error("Ошибка проверки токена:", e);
    }
  }
}
