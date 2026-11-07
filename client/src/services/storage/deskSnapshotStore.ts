import type { INodeDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "../../features/core/interfaces";
import { LEGACY_STORAGE_KEYS } from "./storageKeys";

export interface PendingMutations {
  nodes: INodeDB[];
  deletedIds: string[];
}

interface StoredSnapshotRecord {
  deskId: string;
  snapshot: DeskSnapshot;
  updatedAt: number;
}

interface StoredMutationsRecord {
  deskId: string;
  nodes: INodeDB[];
  deletedIds: string[];
  updatedAt: number;
}

const DB_NAME = "anodes_storage";
const DB_VERSION = 2;
const STORE_NAME = "desk_snapshots";
const MUTATIONS_STORE_NAME = "pending_mutations";
const MAX_SNAPSHOTS = 50;

class DeskSnapshotStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback = new Map<string, DeskSnapshot>();
  private mutationsFallback = new Map<string, PendingMutations>();

  private getDB(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "deskId" });
            store.createIndex("updatedAt", "updatedAt");
          }
          if (!db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
            db.createObjectStore(MUTATIONS_STORE_NAME, { keyPath: "deskId" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn("[DeskSnapshotStore] Ошибка открытия IndexedDB, используется fallback:", req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn("[DeskSnapshotStore] IndexedDB недоступен:", err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  async getSnapshot(deskId: string): Promise<DeskSnapshot | null> {
    const db = await this.getDB();
    if (!db) {
      if (this.memoryFallback.has(deskId)) {
        return this.memoryFallback.get(deskId) ?? null;
      }
      return this.readAndMigrateLegacy(deskId);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(deskId);

        req.onsuccess = () => {
          const record = req.result as StoredSnapshotRecord | undefined;
          if (record && record.snapshot) {
            resolve(record.snapshot);
          } else {
            resolve(this.readAndMigrateLegacy(deskId));
          }
        };

        req.onerror = () => {
          resolve(this.readAndMigrateLegacy(deskId));
        };
      } catch {
        resolve(this.readAndMigrateLegacy(deskId));
      }
    });
  }

  async setSnapshot(deskId: string, snapshot: DeskSnapshot): Promise<void> {
    this.memoryFallback.set(deskId, snapshot);
    this.removeLegacyKey(deskId);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const record: StoredSnapshotRecord = {
          deskId,
          snapshot,
          updatedAt: Date.now(),
        };
        store.put(record);

        tx.oncomplete = () => {
          this.pruneOldSnapshots(db);
          resolve();
        };
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async deleteSnapshot(deskId: string): Promise<void> {
    this.memoryFallback.delete(deskId);
    this.removeLegacyKey(deskId);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(deskId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearSnapshots(): Promise<void> {
    this.memoryFallback.clear();
    this.mutationsFallback.clear();
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const stores = db.objectStoreNames.contains(MUTATIONS_STORE_NAME)
          ? [STORE_NAME, MUTATIONS_STORE_NAME]
          : [STORE_NAME];
        const tx = db.transaction(stores, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        if (stores.includes(MUTATIONS_STORE_NAME)) {
          tx.objectStore(MUTATIONS_STORE_NAME).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async savePendingMutations(
    deskId: string,
    nodes: INodeDB[],
    deletedIds: string[],
  ): Promise<void> {
    const isEmpty = nodes.length === 0 && deletedIds.length === 0;
    if (isEmpty) {
      this.mutationsFallback.delete(deskId);
    } else {
      this.mutationsFallback.set(deskId, { nodes, deletedIds });
    }

    const db = await this.getDB();
    if (!db || !db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
        const store = tx.objectStore(MUTATIONS_STORE_NAME);
        if (isEmpty) {
          store.delete(deskId);
        } else {
          const record: StoredMutationsRecord = {
            deskId,
            nodes,
            deletedIds,
            updatedAt: Date.now(),
          };
          store.put(record);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getPendingMutations(deskId: string): Promise<PendingMutations | null> {
    const db = await this.getDB();
    if (!db || !db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
      return this.mutationsFallback.get(deskId) ?? null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
        const store = tx.objectStore(MUTATIONS_STORE_NAME);
        const req = store.get(deskId);

        req.onsuccess = () => {
          const record = req.result as StoredMutationsRecord | undefined;
          if (
            record &&
            ((Array.isArray(record.nodes) && record.nodes.length > 0) ||
              (Array.isArray(record.deletedIds) && record.deletedIds.length > 0))
          ) {
            resolve({
              nodes: record.nodes ?? [],
              deletedIds: record.deletedIds ?? [],
            });
          } else {
            resolve(this.mutationsFallback.get(deskId) ?? null);
          }
        };

        req.onerror = () => {
          resolve(this.mutationsFallback.get(deskId) ?? null);
        };
      } catch {
        resolve(this.mutationsFallback.get(deskId) ?? null);
      }
    });
  }

  private readAndMigrateLegacy(deskId: string): DeskSnapshot | null {
    if (typeof localStorage === "undefined") return null;
    const legacyKey = `${LEGACY_STORAGE_KEYS.CACHE_PREFIX}${deskId}`;
    try {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DeskSnapshot;
      if (parsed && Array.isArray(parsed.nodes)) {
        void this.setSnapshot(deskId, parsed);
        localStorage.removeItem(legacyKey);
        return parsed;
      }
    } catch {}
    return null;
  }

  private removeLegacyKey(deskId: string): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(`${LEGACY_STORAGE_KEYS.CACHE_PREFIX}${deskId}`);
    } catch {}
  }

  private pruneOldSnapshots(db: IDBDatabase): void {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result;
        if (count <= MAX_SNAPSHOTS) return;

        const toDeleteCount = count - MAX_SNAPSHOTS;
        const index = store.index("updatedAt");
        const cursorReq = index.openCursor();
        let deleted = 0;

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < toDeleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      };
    } catch {}
  }
}

export const deskSnapshotStore = new DeskSnapshotStore();

export const savePendingMutations = (
  deskId: string,
  nodes: INodeDB[],
  deletedIds: string[],
): Promise<void> => deskSnapshotStore.savePendingMutations(deskId, nodes, deletedIds);

export const getPendingMutations = (
  deskId: string,
): Promise<PendingMutations | null> => deskSnapshotStore.getPendingMutations(deskId);


