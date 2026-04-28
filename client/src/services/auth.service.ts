// client/src/services/auth.service.ts

import type { IUser } from '@shared/types';
import { render } from '../router';

const API_URL = import.meta.env.VITE_API_URL;

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: IUser;
  isNew: boolean;
}

// --- токены ---

export function saveTokens(token: string, refreshToken: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function removeTokens(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  removeUser(); 
}

// --- авторизация ---

export async function googleAuth(credential: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) throw new Error(`Ошибка авторизации: ${response.status}`);

  return response.json() as Promise<AuthResponse>;
}

// --- обновление токена ---

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  console.log('refreshToken из localStorage:', refreshToken);
  
  if (!refreshToken) {
    console.log('refresh токен не найден');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    console.log('статус ответа /refresh:', response.status);
    const data = await response.json();
    console.log('ответ /refresh:', data);

    if (!response.ok) {
      removeTokens();
      return null;
    }

    saveTokens(data.token, data.refreshToken);
    return data.token;
  } catch (e) {
    console.error('ошибка refresh запроса:', e);
    return null;
  }
}

// --- logout ---

export async function logout(): Promise<void> {
  const token = getToken();

  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } finally {
    removeUser()
    removeTokens();
    history.pushState({}, '', '/welcome');
    render();
  }
}

export function saveUser(user: IUser): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser(): IUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  return JSON.parse(raw) as IUser;
}

export function removeUser(): void {
  localStorage.removeItem('user');
}

export async function handleCredential(response: { credential: string }): Promise<void> {
  const result = await googleAuth(response.credential);
  saveTokens(result.token, result.refreshToken);
  saveUser(result.user);

  if (result.isNew) {
    history.pushState({}, '', '/register');
  } else {
    history.pushState({}, '', '/');
  }
  render();
}