import { getToken, saveUser } from "@services/auth.service";
import api from "@features/core/api";
import { app } from "@/app";

export async function authGuard(): Promise<void> {
  const token = getToken();
  const path = window.location.pathname;

  const publicRoutes = ["/welcome", "/register"];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    app.gotoPage_welcome();
    return;
  }

  if (token && path === "/welcome") {
    app.gotoPage_home();
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
