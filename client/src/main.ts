import "@styles/style.scss";
import { router } from "./router";

import { renderHeader } from "./components/header"; // добавить
import { renderFooter } from "./components/footer"; // добавить
// import { authGuard } from "./services/auth.guard";
import { handleCredential } from "./services/auth.service";

(window as any).google?.accounts?.id?.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  callback: handleCredential,
});

async function init() {
  renderHeader();
  renderFooter();
  // await authGuard();
  router.init();
}
init();
