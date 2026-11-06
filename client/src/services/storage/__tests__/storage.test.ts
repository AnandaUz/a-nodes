import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEYS,
  viewportStore,
  deskSnapshotStore,
  cleanupLegacyStorage,
  clearAllAppData,
} from "../index";
import type { DeskSnapshot } from "../../../features/core/interfaces";

describe("Storage Optimization System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("ViewportStore (Шаг 2: Единый реестр и LRU)", () => {
    it("сохраняет и считывает координаты доски", () => {
      viewportStore.saveViewport("desk_1", { x: 100, y: 200, scale: 1.5 });
      const state = viewportStore.getViewport("desk_1");

      expect(state).toEqual({ x: 100, y: 200, scale: 1.5 });
      // Должен сохраняться в едином ключе
      const raw = localStorage.getItem(STORAGE_KEYS.VIEWPORTS);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed["desk_1"]).toBeDefined();
    });

    it("мигрирует старый ключ вида viewport-state<id>", () => {
      localStorage.setItem("viewport-statedesk_old", JSON.stringify({ x: 50, y: 60, scale: 2 }));
      const state = viewportStore.getViewport("desk_old");

      expect(state).toEqual({ x: 50, y: 60, scale: 2 });
      // Старый ключ удаляется
      expect(localStorage.getItem("viewport-statedesk_old")).toBeNull();
      // Новый реестр содержит данные
      expect(viewportStore.getViewport("desk_old")).toEqual({ x: 50, y: 60, scale: 2 });
    });

    it("ограничивает реестр до 30 записей по правилу LRU", () => {
      for (let i = 0; i < 35; i++) {
        viewportStore.saveViewport(`desk_${i}`, { x: i, y: i, scale: 1 });
      }

      const raw = localStorage.getItem(STORAGE_KEYS.VIEWPORTS);
      const registry = JSON.parse(raw!);
      const keys = Object.keys(registry);

      expect(keys.length).toBe(30);
      // Самые старые desk_0..desk_4 должны быть вытеснены
      expect(registry["desk_0"]).toBeUndefined();
      expect(registry["desk_34"]).toBeDefined();
    });
  });

  describe("StorageCleanup & Namespacing (Шаги 3 и 4)", () => {
    it("мигрирует все старые разрозненные ключи в namespaced формат", () => {
      localStorage.setItem("token", "legacy_token_123");
      localStorage.setItem("refreshToken", "legacy_refresh_456");
      localStorage.setItem("user", JSON.stringify({ id: "user_1", name: "Alice" }));
      localStorage.setItem("desk_nav_hint_seen", "true");
      localStorage.setItem("viewport-statedesk_abc", JSON.stringify({ x: 10, y: 20, scale: 1 }));

      cleanupLegacyStorage();

      // Старые удалены
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(localStorage.getItem("desk_nav_hint_seen")).toBeNull();
      expect(localStorage.getItem("viewport-statedesk_abc")).toBeNull();

      // Новые сохранены
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBe("legacy_token_123");
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)).toBe("legacy_refresh_456");
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_USER)).toContain("Alice");
      expect(localStorage.getItem(STORAGE_KEYS.HINT_SEEN)).toBe("true");
      expect(viewportStore.getViewport("desk_abc")).toEqual({ x: 10, y: 20, scale: 1 });
    });

    it("полностью очищает данные приложения при выходе (clearAllAppData)", async () => {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "token");
      localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, "rt");
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, "user");
      viewportStore.saveViewport("desk_test", { x: 0, y: 0, scale: 1 });

      await clearAllAppData();

      expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_USER)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.VIEWPORTS)).toBeNull();
    });
  });

  describe("DeskSnapshotStore (Шаг 1: Хранилище снимков досок)", () => {
    it("сохраняет и извлекает снимок доски", async () => {
      const snapshot: DeskSnapshot = {
        nodes: [{ _id: "n1", type: 1, x: 10, y: 20 } as any],
        pageNode: null,
      };

      await deskSnapshotStore.setSnapshot("desk_test_snap", snapshot);
      const loaded = await deskSnapshotStore.getSnapshot("desk_test_snap");

      expect(loaded).toBeDefined();
      expect(loaded?.nodes.length).toBe(1);
      expect(loaded?.nodes[0]?._id).toBe("n1");
    });

    it("мигрирует старый snapshot из localStorage anodes_desk_cache_*", async () => {
      const snapshot: DeskSnapshot = {
        nodes: [{ _id: "legacy_node", type: 1, x: 0, y: 0 } as any],
        pageNode: null,
      };
      localStorage.setItem("anodes_desk_cache_desk_migr", JSON.stringify(snapshot));

      const loaded = await deskSnapshotStore.getSnapshot("desk_migr");

      expect(loaded).toBeDefined();
      expect(loaded?.nodes[0]?._id).toBe("legacy_node");
      // После миграции старый ключ удаляется из localStorage
      expect(localStorage.getItem("anodes_desk_cache_desk_migr")).toBeNull();
    });
  });
});

