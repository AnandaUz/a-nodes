import html from "./welcome.html?raw";
import "./welcome.scss";
import { initGoogleAuth } from "@services/auth.service";

export function welcomePage() {
  return {
    html,
    title: "Добро пожаловать — Liner",
    async init() {
      const container = document.querySelector(".for-google-btn");
      if (container) {
        try {
          await initGoogleAuth();
          (window as any).google?.accounts?.id?.renderButton(container, {
            theme: "outline",
            size: "large",
          });
        } catch (e) {
          console.error("Ошибка инициализации Google Auth:", e);
        }
      }
    },
  };
}
