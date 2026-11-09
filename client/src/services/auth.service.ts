import type { IUser } from "@shared/types";
import {
  STORAGE_KEYS,
  LEGACY_STORAGE_KEYS,
  clearAllAppData,
  cleanupLegacyStorage,
} from "./storage";

if (typeof window !== "undefined") {
  cleanupLegacyStorage();
}

const API_URL = import.meta.env.VITE_API_URL;

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: IUser;
  isNew: boolean;
}

// --- токены ---

export function saveTokens(token: string, refreshToken: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, refreshToken);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_REFRESH_TOKEN);
  } catch {}
}

export function getToken(): string | null {
  return (
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ??
    localStorage.getItem(LEGACY_STORAGE_KEYS.AUTH_TOKEN)
  );
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN) ??
    localStorage.getItem(LEGACY_STORAGE_KEYS.AUTH_REFRESH_TOKEN)
  );
}

export function removeTokens(): void {
  void clearAllAppData();
}

// --- авторизация ---

export async function googleAuth(credential: string): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
  } catch {
    const msg = "Сервер недоступен. Убедитесь, что бэкенд запущен.";
    alert(msg);
    throw new Error(msg);
  }

  if (response.status === 503) {
    const data = await response.json().catch(() => null);
    const msg = data?.message ?? "База данных недоступна.";
    alert(msg);
    throw new Error(msg);
  }

  if (!response.ok) throw new Error(`Ошибка авторизации: ${response.status}`);

  return response.json() as Promise<AuthResponse>;
}

// --- обновление токена ---

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      removeTokens();
      return null;
    }

    saveTokens(data.token, data.refreshToken);
    return data.token;
  } catch (e) {
    console.error("ошибка refresh запроса:", e);
    return null;
  }
}

// --- logout ---

export async function logout(): Promise<void> {
  const token = getToken();

  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } finally {
    removeUser();
    removeTokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  }
}

export function saveUser(user: IUser): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_USER);
  } catch {}
}

export function getUser(): IUser | null {
  const raw =
    localStorage.getItem(STORAGE_KEYS.AUTH_USER) ??
    localStorage.getItem(LEGACY_STORAGE_KEYS.AUTH_USER);
  if (!raw) return null;
  return JSON.parse(raw) as IUser;
}

export function removeUser(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_USER);
  } catch {}
}

export async function handleCredential(response: {
  credential: string;
}): Promise<void> {
  const result = await googleAuth(response.credential);
  saveTokens(result.token, result.refreshToken);
  saveUser(result.user);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:login", { detail: result }));
  }
}

export function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.accounts?.id) return resolve();
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function initGoogleAuth(): Promise<void> {
  await loadGsi();
  (window as any).google?.accounts?.id?.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleCredential,
  });
}
