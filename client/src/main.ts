import '@styles/style.scss'
import { render } from './router';

import { renderHeader } from './components/header'; // добавить
import { renderFooter } from './components/footer'; // добавить
import { authGuard } from './services/auth.guard';
import { handleCredential } from './services/auth.service';

google.accounts.id.initialize({
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

document.addEventListener('click', (e) => {
  const target = e.target as HTMLAnchorElement;
  
  if (target.tagName === 'A' && target.href.startsWith(window.location.origin)) {
    e.preventDefault();
    history.pushState({}, '', target.href);
    authGuard().then(() => {
      renderHeader();
      render();
    });
  }
});

// Обрабатываем кнопки браузера "назад" / "вперёд"
window.addEventListener('popstate', () => {
  authGuard().then(() => {
      renderHeader();
      render();
    });
});


/*
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>

    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
    <button id="settings-btn">Settings</button>
  </div>
`


document.querySelector<HTMLButtonElement>('#settings-btn')!
  .addEventListener('click', () => navigate('/settings'))

  */