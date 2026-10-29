import api from "@/features/core/api";
import { core, EVENTS } from "./core";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { toDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "./interfaces";
import { areSnapshotsEqual } from "@/features/nodes/snapshotUtils";

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

  constructor(opts: ServerPersistenceOptions) {
    this.opts = opts;

    this.unsubscribers = [
      core.store.on(EVENTS.node.updated, (node) => {
        this.updateNode(node);
      }),
    ];

    window.addEventListener("beforeunload", this.onBeforeUnload);
  }
  private getCacheKey(): string {
    return `anodes_desk_cache_${this.opts.deskId}`;
  }

  async init(): Promise<void> {
    const cacheKey = this.getCacheKey();
    let hasCache = false;
    let cachedSnapshot: DeskSnapshot | null = null;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as DeskSnapshot;
        if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          hasCache = true;
          cachedSnapshot = parsed;
          core.store.emit(EVENTS.server.loaded, parsed);
        }
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
  }

  private async load(cachedSnapshot?: DeskSnapshot | null): Promise<void> {
    const response = await api.loadNodes(this.opts.deskId);
    if (response) {
      const freshSnapshot: DeskSnapshot = {
        nodes: response.nodes || [],
        pageNode: response.pageNode || null,
      };

      try {
        localStorage.setItem(this.getCacheKey(), JSON.stringify(freshSnapshot));
      } catch {}

      if (cachedSnapshot && areSnapshotsEqual(cachedSnapshot, freshSnapshot)) {
        return;
      }
      if (this.dirtyNodes.size === 0) {
        core.store.emit(EVENTS.server.loaded, freshSnapshot);
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

    const token = (
      document.cookie.match(/token=([^;]+)/) ||
      [null, localStorage.getItem("token")]
    )[1];

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
      const pageNode = core.nodeManager.pageNode ? toDB(core.nodeManager.pageNode) : undefined;
      localStorage.setItem(this.getCacheKey(), JSON.stringify({ nodes, pageNode }));
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

  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    window.removeEventListener("beforeunload", this.onBeforeUnload);
  }
}
