import html from './register.html?raw';
import { render } from '../../router';
import { fetchWithAuth } from '@/services/api';
import { saveTokens } from '@/services/auth.service';
import "./register.scss";

export function registerPage() {
  return {
    html,
    title: 'Регистрация — Liner',
    init() {
      const input = document.getElementById('name-input') as HTMLInputElement;
      const btn = document.getElementById('register-btn');

      btn?.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }

        try {
          const response = await fetchWithAuth(`/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          });

          if (!response.ok) throw new Error('Ошибка регистрации');

          const data = await response.json();
          saveTokens(data.token, data.refreshToken);

          history.pushState({}, '', '/');
          render();
        } catch (e) {
          console.error('Ошибка регистрации:', e);
        }
      });
    }
  };
}