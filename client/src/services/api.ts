// client/src/services/api.ts

import { getToken, refreshAccessToken, removeTokens } from './auth.service';
import { render } from '../router';

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = { method: 'GET', ...options, headers };

  const response = await fetch(`${API_URL}${path}`, config);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      removeTokens();
      history.pushState({}, '', '/welcome');
      render();
      throw new Error('Сессия истекла');
    }
    headers.set('Authorization', `Bearer ${newToken}`);
    return fetch(`${API_URL}${path}`, { ...config, headers });
  }

  return response;
}