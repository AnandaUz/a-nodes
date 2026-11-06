import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "./storageKeys";
import { viewportStore } from "./viewportStore";
import { deskSnapshotStore } from "./deskSnapshotStore";

export function cleanupLegacyStorage(): void {
  if (typeof localStorage === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      // 1. Миграция старых viewport-state*
      if (key.startsWith(LEGACY_STORAGE_KEYS.VIEWPORT_PREFIX)) {
        const deskId = key.slice(LEGACY_STORAGE_KEYS.VIEWPORT_PREFIX.length);
        if (deskId) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.x === "number") {
                viewportStore.saveViewport(deskId, parsed);
              }
            }
          } catch {}
        }
        localStorage.removeItem(key);
      }

      // 2. Миграция старых кэшей нод anodes_desk_cache_*
      if (key.startsWith(LEGACY_STORAGE_KEYS.CACHE_PREFIX)) {
        const deskId = key.slice(LEGACY_STORAGE_KEYS.CACHE_PREFIX.length);
        if (deskId) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && Array.isArray(parsed.nodes)) {
                void deskSnapshotStore.setSnapshot(deskId, parsed);
              }
            }
          } catch {}
        }
        localStorage.removeItem(key);
      }

      // 3. Миграция старых токенов/пользователя/подсказок
      if (key === LEGACY_STORAGE_KEYS.AUTH_TOKEN) {
        const token = localStorage.getItem(key);
        if (token && !localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        }
        localStorage.removeItem(key);
      } else if (key === LEGACY_STORAGE_KEYS.AUTH_REFRESH_TOKEN) {
        const rt = localStorage.getItem(key);
        if (rt && !localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)) {
          localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, rt);
        }
        localStorage.removeItem(key);
      } else if (key === LEGACY_STORAGE_KEYS.AUTH_USER) {
        const user = localStorage.getItem(key);
        if (user && !localStorage.getItem(STORAGE_KEYS.AUTH_USER)) {
          localStorage.setItem(STORAGE_KEYS.AUTH_USER, user);
        }
        localStorage.removeItem(key);
      } else if (key === LEGACY_STORAGE_KEYS.HINT_SEEN) {
        const hint = localStorage.getItem(key);
        if (hint && !localStorage.getItem(STORAGE_KEYS.HINT_SEEN)) {
          localStorage.setItem(STORAGE_KEYS.HINT_SEEN, hint);
        }
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn("[storageCleanup] Ошибка очистки legacy storage:", err);
  }
}

export async function clearAllAppData(): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem(STORAGE_KEYS.VIEWPORTS);

      // Удалить legacy ключи, если остались
      localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_REFRESH_TOKEN);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.AUTH_USER);

      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (
          key.startsWith(LEGACY_STORAGE_KEYS.VIEWPORT_PREFIX) ||
          key.startsWith(LEGACY_STORAGE_KEYS.CACHE_PREFIX)
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  await deskSnapshotStore.clearSnapshots().catch(() => {});
}

