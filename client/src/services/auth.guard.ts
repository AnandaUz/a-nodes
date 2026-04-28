// client/src/services/auth.guard.ts

import { getToken } from './auth.service';
import { fetchWithAuth } from './api';
import { render } from '../router';

export async function authGuard(): Promise<void> {
  const token = getToken();
  const path = window.location.pathname;

  const publicRoutes = ['/welcome', '/register'];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    history.pushState({}, '', '/welcome');
    render();
    return;
  }

  if (token && path === '/welcome') {
    history.pushState({}, '', '/');
    render();
    return;
  }

  if (token) {
    try {
      await fetchWithAuth('/api/auth/verify');
    } catch (e) {
      console.error('Ошибка проверки токена:', e);
    }
  }
}