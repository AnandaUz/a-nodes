import api from "@/features/core/api";
import { core, EVENTS } from "./core";
import Tools from "./Tools";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { toDB, type INodeDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "./interfaces";
import { areSnapshotsEqual } from "@/features/nodes/snapshotUtils";
import { getToken } from "@services/auth.service";
import {
  deskSnapshotStore,
  getPendingMutations,
  savePendingMutations,
} from "@services/storage";

interface ServerPersistenceOptions {
  apiUrl: string; // например '/api/desks'
  deskId: string;
  token?: string | undefined; // JWT из твоей auth-системы
}
const DEBOUNCE_MS = 1000; // серверу даём чуть больше времени
export class ServerPersistence {
  private opts: ServerPersistenceOptions;

  // data: LNode[] = [];
  private dirtyNodes: Set<LNode> = new Set();
  private restoredDirtyNodes: Map<string, INodeDB> = new Map();
  private pendingDeleteIds: Set<string> = new Set();
  private pendingCreateCallbacks: Map<LNode, (id: string) => void> = new Map();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isScheduleMicrotaskQueued = false;
  private unsubscribers: Array<() => void> = [];
  private isSaving = false;

  private eventSource: EventSource | null = null;
  private lastServerTime: string | null = null;
  private isFetchingDelta = false;
  private hasPendingDelta = false;
  private lastDeltaFetchTime = 0;

  constructor(opts: ServerPersistenceOptions) {
    this.opts = opts;

    this.unsubscribers = [
      core.store.on(EVENTS.node.updated, (node) => {
        this.updateNode(node);
      }),
    ];

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.onBeforeUnload);
      window.addEventListener("focus", this.onVisibilityOrFocus);
      window.addEventListener("online", this.onOnline);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityOrFocus);
    }
  }
  async init(): Promise<void> {
    let hasCache = false;
    let cachedSnapshot: DeskSnapshot | null = null;
    try {
      const [cached, pending] = await Promise.all([
        deskSnapshotStore.getSnapshot(this.opts.deskId),
        getPendingMutations(this.opts.deskId),
      ]);

      if (pending) {
        for (const node of pending.nodes) {
          const key = node._id || String(node.s ?? "");
          if (key) this.restoredDirtyNodes.set(key, node);
        }
        for (const id of pending.deletedIds) {
          this.pendingDeleteIds.add(id);
        }
      }

      if (cached && Array.isArray(cached.nodes) && cached.nodes.length > 0) {
        if (pending) {
          const mergedMap = new Map<string, INodeDB>();
          for (const n of cached.nodes) {
            if (n._id && this.pendingDeleteIds.has(n._id)) continue;
            const key = n._id || String(n.s ?? "");
            if (key) mergedMap.set(key, n);
          }
          for (const [key, n] of this.restoredDirtyNodes) {
            if (n.inTrash || (n._id && this.pendingDeleteIds.has(n._id))) {
              mergedMap.delete(key);
            } else {
              mergedMap.set(key, n);
            }
          }
          cached.nodes = Array.from(mergedMap.values());
        }
        hasCache = true;
        cachedSnapshot = cached;
        core.store.emit(EVENTS.server.loaded, cached);
      }
    } catch (e) {
      console.warn("[ServerPersistence] Ошибка чтения кэша:", e);
    }

    if (hasCache) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("loader:hide"));
      }
      this.load(cachedSnapshot).catch((err) => {
        console.warn("[ServerPersistence] Фоновая загрузка нод не удалась:", err);
      });
    } else {
      await this.load().catch((err) => {
        console.warn("[ServerPersistence] Загрузка нод не удалась:", err);
      });
    }

    this.initSSE();
  }

  private hasPendingMutations(): boolean {
    return (
      this.dirtyNodes.size > 0 ||
      this.restoredDirtyNodes.size > 0 ||
      this.pendingDeleteIds.size > 0
    );
  }

  private persistPendingMutations(): void {
    try {
      const nodesMap = new Map<string, INodeDB>(this.restoredDirtyNodes);
      for (const node of this.dirtyNodes) {
        if (node._id !== "") {
          const dbNode = toDB(node);
          const key = dbNode._id || String(node.lID || dbNode.s || "");
          if (key) nodesMap.set(key, dbNode);
        }
      }
      const nodes = Array.from(nodesMap.values());
      const deleteIds = Array.from(this.pendingDeleteIds);
      void savePendingMutations(this.opts.deskId, nodes, deleteIds);
    } catch {}
  }

  private async load(cachedSnapshot?: DeskSnapshot | null): Promise<void> {
    if (this.hasPendingMutations()) {
      await this.save();
    }

    const response = await api.loadNodes(this.opts.deskId);
    if (response) {
      if (response.serverTime) {
        this.lastServerTime = response.serverTime;
      }
      const nodes = (response.nodes || []).filter(
        (n: { _id?: string }) => !n._id || !this.pendingDeleteIds.has(n._id),
      );
      const freshSnapshot: DeskSnapshot = {
        nodes,
        pageNode: response.pageNode || null,
        breadcrumbs: response.breadcrumbs || [],
      };

      if (!this.hasPendingMutations()) {
        void deskSnapshotStore.setSnapshot(this.opts.deskId, freshSnapshot);
      }

      if (cachedSnapshot && areSnapshotsEqual(cachedSnapshot, freshSnapshot)) {
        return;
      }
      if (!this.hasPendingMutations()) {
        core.store.emit(EVENTS.server.loaded, freshSnapshot);
      } else if (core.nodeManager) {
        core.nodeManager.applyDeltaSnapshot(freshSnapshot, this.dirtyNodes);
        this.cacheCurrentNodes();
      }
    }
  }
  createNode(node: LNode, onCreated?: (id: string) => void): void {
    if (this.opts.deskId !== "root") {
      node.pageId = this.opts.deskId;
    }
    if (!node._id) {
      node._id = Tools.generateObjectId();
    }
    if (onCreated) {
      this.pendingCreateCallbacks.set(node, onCreated);
    }
    void this.updateNode(node);
  }
  async updateNode(node: LNode): Promise<void> {
    node.lastUpdate = new Date();
    if (node._id) {
      this.pendingDeleteIds.delete(node._id);
      this.restoredDirtyNodes.delete(node._id);
    }
    if (!this.dirtyNodes.has(node)) this.dirtyNodes.add(node);
    this.persistPendingMutations();
    this.cacheCurrentNodes();
    this.scheduleSave();
  }
  deleteNode(node: LNode): void {
    this.dirtyNodes.delete(node);
    this.pendingCreateCallbacks.delete(node);
    if (node._id) {
      this.restoredDirtyNodes.delete(node._id);
      this.pendingDeleteIds.add(node._id);
      this.persistPendingMutations();
      this.cacheCurrentNodes();
      this.scheduleSave();
    }
  }
  private async save(): Promise<void> {
    if (this.isSaving || !this.hasPendingMutations()) {
      return;
    }
    this.isSaving = true;

    const restoredList = Array.from(this.restoredDirtyNodes.values());
    const dirtyList = Array.from(this.dirtyNodes).filter((n) => n._id !== "");
    const snapshot = [...restoredList, ...dirtyList.map((node) => toDB(node))];
    const deleteIds = Array.from(this.pendingDeleteIds);

    this.restoredDirtyNodes.clear();
    this.dirtyNodes.clear();
    this.pendingDeleteIds.clear();

    try {
      let hasChanges = false;

      if (snapshot.length > 0) {
        try {
          const ids = await api.saveNodes(snapshot);
          if (Array.isArray(ids)) {
            const offset = restoredList.length;
            dirtyList.forEach((node, index) => {
              const savedId = ids[offset + index];
              if (savedId) {
                node._id = savedId;
              }
              const cb = this.pendingCreateCallbacks.get(node);
              if (cb && node._id) {
                this.pendingCreateCallbacks.delete(node);
                cb(node._id);
              }
            });
          }
          hasChanges = true;
        } catch (err) {
          // при ошибке возвращаем ноды обратно в dirty
          restoredList.forEach((n) => {
            const key = n._id || String(n.s ?? "");
            if (key) this.restoredDirtyNodes.set(key, n);
          });
          dirtyList.forEach((n) => this.dirtyNodes.add(n));
          console.warn("[ServerPersistence] Ошибка сохранения:", err);
        }
      }

      if (deleteIds.length > 0) {
        try {
          await api.deleteNodesBatch(deleteIds);
          hasChanges = true;
        } catch (err) {
          deleteIds.forEach((id) => this.pendingDeleteIds.add(id));
          console.warn("[ServerPersistence] Ошибка пакетного удаления нод:", err);
        }
      }

      if (hasChanges) {
        this.cacheCurrentNodes();
      }
    } finally {
      this.persistPendingMutations();
      this.isSaving = false;
      if (this.hasPendingMutations()) {
        this.scheduleSave();
      }
    }
  }

  scheduleSave(): void {
    if (this.isScheduleMicrotaskQueued) return;
    this.isScheduleMicrotaskQueued = true;
    queueMicrotask(() => {
      this.isScheduleMicrotaskQueued = false;
      if (!this.hasPendingMutations()) return;
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        void this.save();
        this.debounceTimer = null;
      }, DEBOUNCE_MS);
    });
  }

  /** Синхронный сброс грязных нод через sendBeacon (при закрытии/перезагрузке вкладки) */
  private flushSync(): void {
    if (!this.hasPendingMutations()) return;

    const token =
      (document.cookie.match(/token=([^;]+)/) || [])[1] || getToken();
    const API_URL = import.meta.env.VITE_API_URL;

    const snapshot = [
      ...Array.from(this.restoredDirtyNodes.values()),
      ...Array.from(this.dirtyNodes)
        .filter((n) => n._id !== "")
        .map((node) => toDB(node)),
    ];

    if (snapshot.length > 0) {
      const prepared = snapshot.map((node) =>
        Object.fromEntries(
          Object.entries(node).map(([k, v]) => [k, v === undefined ? null : v]),
        ),
      );

      const blob = new Blob([JSON.stringify({ nodes: prepared })], {
        type: "application/json",
      });

      if (token) {
        // sendBeacon не поддерживает заголовки, используем keepalive fetch
        fetch(`${API_URL}/nodes/saveNodes`, {
          method: "PUT",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Client-Id": api.clientId,
          },
          body: JSON.stringify({ nodes: prepared }),
        });
      } else {
        navigator.sendBeacon(`${API_URL}/nodes/saveNodes`, blob);
      }

      this.dirtyNodes.clear();
    }

    if (this.pendingDeleteIds.size > 0 && token) {
      const deleteIds = Array.from(this.pendingDeleteIds);
      fetch(`${API_URL}/nodes`, {
        method: "DELETE",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Client-Id": api.clientId,
        },
        body: JSON.stringify({ ids: deleteIds }),
      });
      this.pendingDeleteIds.clear();
    }
  }

  private cacheCurrentNodes(): void {
    try {
      if (!core.nodeManager?.nodes) return;
      const nodes = Array.from(core.nodeManager.nodes.values())
        .filter((n) => !n.inTrash && (!n._id || !this.pendingDeleteIds.has(n._id)))
        .map((n) => toDB(n));
      const pageNode = core.nodeManager.pageNode ? toDB(core.nodeManager.pageNode) : null;
      void deskSnapshotStore.setSnapshot(this.opts.deskId, { nodes, pageNode });
    } catch {}
  }

  private onBeforeUnload = () => {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.persistPendingMutations();
    this.cacheCurrentNodes();
    this.flushSync();
  };

  private onOnline = () => {
    void (async () => {
      if (this.hasPendingMutations()) {
        await this.save();
      }
      this.onVisibilityOrFocus();
    })();
  };

  private onVisibilityOrFocus = () => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;

    if (
      this.eventSource &&
      typeof EventSource !== "undefined" &&
      this.eventSource.readyState === EventSource.CLOSED
    ) {
      this.initSSE();
    }

    const now = Date.now();
    if (now - this.lastDeltaFetchTime < 1000) return;
    this.lastDeltaFetchTime = now;

    void this.applyDelta();
  };

  private async applyDelta(targetServerTime?: string): Promise<void> {
    if (this.isFetchingDelta) {
      this.hasPendingDelta = true;
      return;
    }
    this.isFetchingDelta = true;
    try {
      do {
        this.hasPendingDelta = false;
        this.lastDeltaFetchTime = Date.now();
        const since = this.lastServerTime ?? undefined;
        const response = await api.loadNodes(this.opts.deskId, since);
        if (response) {
          if (response.serverTime) {
            this.lastServerTime = response.serverTime;
          } else if (targetServerTime) {
            this.lastServerTime = targetServerTime;
          }

          const deltaNodes = (response.nodes || []).filter(
            (n: { _id?: string }) => !n._id || !this.pendingDeleteIds.has(n._id),
          );
          const deltaSnapshot: DeskSnapshot = {
            nodes: deltaNodes,
            pageNode: response.pageNode || null,
          };

          if (
            core.nodeManager &&
            (deltaSnapshot.nodes.length > 0 || deltaSnapshot.pageNode)
          ) {
            core.nodeManager.applyDeltaSnapshot(deltaSnapshot, this.dirtyNodes);
          }
          this.cacheCurrentNodes();
        }
      } while (this.hasPendingDelta);
    } catch (err) {
      console.warn("[ServerPersistence] Ошибка применения SSE-дельты:", err);
    } finally {
      this.isFetchingDelta = false;
    }
  }

  private initSSE(): void {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    this.closeSSE();

    const token = this.opts.token || getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    const clientIdParam = `clientId=${encodeURIComponent(api.clientId)}`;
    const sseUrl = `${import.meta.env.VITE_API_URL}/nodes/${this.opts.deskId}/events?${clientIdParam}${tokenParam}`;

    const es = new EventSource(sseUrl);
    this.eventSource = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "nodes_updated") {
          if (data.senderId && data.senderId === api.clientId) return;
          void this.applyDelta(data.serverTime);
        }
      } catch {
        // Пропускаем служебные SSE-сообщения (например ": ping")
      }
    };
    es.onerror = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("connection:offline"));
      }
    };
  }

  private closeSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  unmount() {
    this.closeSSE();
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.onBeforeUnload);
      window.removeEventListener("focus", this.onVisibilityOrFocus);
      window.removeEventListener("online", this.onOnline);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityOrFocus);
    }
  }
}
