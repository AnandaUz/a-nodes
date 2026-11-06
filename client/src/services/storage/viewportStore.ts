import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "./storageKeys";

export interface ViewportStateRecord {
  x: number;
  y: number;
  scale: number;
  updatedAt: number;
}

export interface ViewportCoords {
  x: number;
  y: number;
  scale: number;
}

const MAX_VIEWPORTS = 30;

class ViewportStore {
  private readRegistry(): Record<string, ViewportStateRecord> {
    if (typeof localStorage === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VIEWPORTS);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeRegistry(registry: Record<string, ViewportStateRecord>): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.VIEWPORTS, JSON.stringify(registry));
    } catch (e) {
      console.warn("[ViewportStore] Ошибка записи viewports в localStorage:", e);
    }
  }

  getViewport(deskId: string): ViewportCoords | null {
    const registry = this.readRegistry();
    const entry = registry[deskId];
    if (entry && typeof entry.x === "number" && typeof entry.y === "number" && typeof entry.scale === "number") {
      return { x: entry.x, y: entry.y, scale: entry.scale };
    }

    // Миграция старого ключа
    if (typeof localStorage !== "undefined") {
      const legacyKey = `${LEGACY_STORAGE_KEYS.VIEWPORT_PREFIX}${deskId}`;
      try {
        const raw = localStorage.getItem(legacyKey);
        if (raw) {
          const parsed = JSON.parse(raw) as ViewportCoords;
          if (parsed && typeof parsed.x === "number") {
            this.saveViewport(deskId, parsed);
            localStorage.removeItem(legacyKey);
            return parsed;
          }
        }
      } catch {}
    }

    return null;
  }

  saveViewport(deskId: string, coords: ViewportCoords): void {
    const registry = this.readRegistry();
    registry[deskId] = {
      x: coords.x,
      y: coords.y,
      scale: coords.scale,
      updatedAt: Date.now(),
    };

    // Ограничение LRU до MAX_VIEWPORTS
    const entries = Object.entries(registry);
    if (entries.length > MAX_VIEWPORTS) {
      entries.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
      const excess = entries.length - MAX_VIEWPORTS;
      for (let i = 0; i < excess; i++) {
        const item = entries[i];
        if (item) {
          delete registry[item[0]];
        }
      }
    }

    this.writeRegistry(registry);

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(`${LEGACY_STORAGE_KEYS.VIEWPORT_PREFIX}${deskId}`);
      } catch {}
    }
  }

  clearViewports(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEYS.VIEWPORTS);
    } catch {}
  }
}

export const viewportStore = new ViewportStore();
