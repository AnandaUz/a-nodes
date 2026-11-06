import api from "@/features/core/api";
import { core, EVENTS } from "./core";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { toDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "./interfaces";
import { areSnapshotsEqual } from "@/features/nodes/snapshotUtils";
import { getToken } from "@services/auth.service";
import { deskSnapshotStore } from "@services/storage";

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

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
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
      const cached = await deskSnapshotStore.getSnapshot(this.opts.deskId);
      if (cached && Array.isArray(cached.nodes) && cached.nodes.length > 0) {
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

  private async load(cachedSnapshot?: DeskSnapshot | null): Promise<void> {
    const response = await api.loadNodes(this.opts.deskId);
    if (response) {
      if (response.serverTime) {
        this.lastServerTime = response.serverTime;
      }
      const freshSnapshot: DeskSnapshot = {
        nodes: response.nodes || [],
        pageNode: response.pageNode || null,
        breadcrumbs: response.breadcrumbs || [],
      };

      void deskSnapshotStore.setSnapshot(this.opts.deskId, freshSnapshot);

      if (cachedSnapshot && areSnapshotsEqual(cachedSnapshot, freshSnapshot)) {
        return;
      }
      if (this.dirtyNodes.size === 0) {
        core.store.emit(EVENTS.server.loaded, freshSnapshot);
      } else if (core.nodeManager) {
        core.nodeManager.applyDeltaSnapshot(freshSnapshot, this.dirtyNodes);
      }
    }
  }
  createNode(node: LNode, onCreated?: (id: string) => void): void {
    if (this.opts.deskId !== "root") {
      node.pageId = this.opts.deskId;
    }
    // Запрос летит параллельно — основной код не блокируется.
    // Когда ответ придёт, ID проставится прямо в объект node (по ссылке).
    api
      .saveNodes([toDB(node)])
      .then((_ids) => {
        if (!_ids || _ids.length === 0) return;
        node._id = _ids[0] || "";
        onCreated?.(node._id);
        // this.data.push(node);
      })
      .catch((err) => {
        console.warn("[ServerPersistence] Ошибка создания ноды:", err);
      });
  }
  async updateNode(node: LNode): Promise<void> {
    node.lastUpdate = new Date();
    if (!this.dirtyNodes.has(node)) this.dirtyNodes.add(node);
    this.scheduleSave();
  }
  deleteNode(node: LNode): void {
    this.dirtyNodes.delete(node);
    if (node._id) {
      api.deleteNode(node._id).catch((err) => {
        console.warn("[ServerPersistence] Ошибка удаления ноды:", err);
      });
    }
  }
  private async save(): Promise<void> {
    if (this.isSaving || this.dirtyNodes.size === 0) return;
    this.isSaving = true;

    const dirtyList = Array.from(this.dirtyNodes).filter((n) => n._id !== "");
    const snapshot = dirtyList.map((node) => toDB(node));

    this.dirtyNodes.clear();
    try {
      await api.saveNodes(snapshot);
    } catch (err) {
      // при ошибке возвращаем ноды обратно в dirty
      dirtyList.forEach((n) => this.dirtyNodes.add(n));
      console.warn("[ServerPersistence] Ошибка сохранения:", err);
    } finally {
      this.isSaving = false;
    }
  }

  scheduleSave(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.save();
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  /** Синхронный сброс грязных нод через sendBeacon (при закрытии/перезагрузке вкладки) */
  private flushSync(): void {
    if (this.dirtyNodes.size === 0) return;

    const snapshot = Array.from(this.dirtyNodes)
      .filter((n) => n._id !== "")
      .map((node) => toDB(node));

    if (snapshot.length === 0) return;

    const prepared = snapshot.map((node) =>
      Object.fromEntries(
        Object.entries(node).map(([k, v]) => [k, v === undefined ? null : v]),
      ),
    );

    const token =
      (document.cookie.match(/token=([^;]+)/) || [])[1] || getToken();

    const blob = new Blob([JSON.stringify({ nodes: prepared })], {
      type: "application/json",
    });

    const API_URL = import.meta.env.VITE_API_URL;
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

  private cacheCurrentNodes(): void {
    try {
      if (!core.nodeManager?.nodes) return;
      const nodes = Array.from(core.nodeManager.nodes.values()).map((n) => toDB(n));
      const pageNode = core.nodeManager.pageNode ? toDB(core.nodeManager.pageNode) : null;
      void deskSnapshotStore.setSnapshot(this.opts.deskId, { nodes, pageNode });
    } catch {}
  }

  private onBeforeUnload = () => {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.cacheCurrentNodes();
    this.flushSync();
  };

  private onOnline = () => {
    if (this.dirtyNodes.size > 0) {
      this.scheduleSave();
    }
    this.onVisibilityOrFocus();
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

          const deltaSnapshot: DeskSnapshot = {
            nodes: response.nodes || [],
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
