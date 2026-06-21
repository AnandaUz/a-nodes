// client/src/services/auth.guard.ts

import { getToken, saveUser } from "./auth.service";
import api from "@/features/core/api";
import { router } from "../router";

export async function authGuard(): Promise<void> {
  const token = getToken();
  const path = window.location.pathname;

  const publicRoutes = ["/welcome", "/register"];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    history.pushState({}, "", "/welcome");
    router.render();
    return;
  }

  if (token && path === "/welcome") {
    history.pushState({}, "", "/");
    router.render();
    return;
  }

  if (token) {
    try {
      const res = await api.fetchWithAuth("/api/auth/verify");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          saveUser(data.user);
        }
      }
    } catch (e) {
      console.error("Ошибка проверки токена:", e);
    }
  }
}
