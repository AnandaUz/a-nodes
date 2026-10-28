import html from "./register.html?raw";
import api from "@/features/core/api";
import { saveTokens, saveUser } from "@/services/auth.service";
import "./register.scss";

export function registerPage() {
  return {
    html,
    title: "Регистрация — Liner",
    init() {
      const input = document.getElementById("name-input") as HTMLInputElement;
      const btn = document.getElementById("register-btn");

      btn?.addEventListener("click", async () => {
        const name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }

        try {
          const response = await api.fetchWithAuth(`/api/auth/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
          });

          if (!response.ok) throw new Error("Ошибка регистрации");

          const data = await response.json();
          saveTokens(data.token, data.refreshToken || "");
          if (data.user) {
            saveUser(data.user);
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:login", { detail: data }));
          }
        } catch (e) {
          console.error("Ошибка регистрации:", e);
        }
      });
    },
  };
}
