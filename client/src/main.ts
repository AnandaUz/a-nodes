import "@styles/style.scss";
import { router } from "./router";

import { renderHeader } from "./components/header"; // добавить
import { renderFooter } from "./components/footer"; // добавить
import { authGuard } from "./services/auth.guard";
import { handleCredential } from "./services/auth.service";

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initGoogleAuth() {
  await loadGsi();
  (window as any).google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleCredential,
  });
}

async function init() {
  renderHeader();
  renderFooter();
  await initGoogleAuth();
  await authGuard();
  router.init();
}
init();
