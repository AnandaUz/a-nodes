import html from "./welcome.html?raw";
import "./welcome.scss";

export function welcomePage() {
  return {
    html,
    title: "Добро пожаловать — Liner",
    init() {
      document.querySelector(".google-btn")?.addEventListener("click", () => {
        (window as any).google?.accounts?.id?.prompt();
      });
    },
  };
}
