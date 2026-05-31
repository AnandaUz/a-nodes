import "@styles/style.scss";
import { render } from "./router";

import { renderHeader } from "./components/header"; // добавить
import { renderFooter } from "./components/footer"; // добавить
import { authGuard } from "./services/auth.guard";
import { handleCredential } from "./services/auth.service";
import Tools from "./features/core/Tools";

(window as any).google?.accounts?.id?.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  callback: handleCredential,
});

async function init() {
  renderHeader();
  renderFooter();
  await authGuard();
  render();
}
init();

document.addEventListener("click", (e) => {
  const target = e.target as HTMLAnchorElement;

  if (
    target.tagName === "A" &&
    target.href.startsWith(window.location.origin)
  ) {
    Tools.stopEvent(e);
    history.pushState({}, "", target.href);
    authGuard().then(() => {
      renderHeader();
      render();
    });
  }
});

// Обрабатываем кнопки браузера "назад" / "вперёд"
window.addEventListener("popstate", () => {
  authGuard().then(() => {
    renderHeader();
    render();
  });
});
