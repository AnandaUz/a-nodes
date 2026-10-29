import type { IUser } from "@shared/types";

const API_URL = import.meta.env.VITE_API_URL;

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: IUser;
  isNew: boolean;
}

// --- токены ---

export function saveTokens(token: string, refreshToken: string): void {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

export function removeTokens(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  removeUser();
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("anodes_desk_cache_")) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
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
  console.log("refreshToken из localStorage:", refreshToken);

  if (!refreshToken) {
    console.log("refresh токен не найден");
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    console.log("статус ответа /refresh:", response.status);
    const data = await response.json();
    console.log("ответ /refresh:", data);

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
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): IUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw) as IUser;
}

export function removeUser(): void {
  localStorage.removeItem("user");
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
