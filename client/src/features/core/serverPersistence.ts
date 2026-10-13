import api from "@/features/core/api";
import { core, EVENTS } from "./core";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { toDB } from "@shared/types/INodeDB";

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
  }
  async init(): Promise<void> {
    await this.load();
    // this.bindStore();
  }
  private async load(): Promise<void> {
    const snapshot = await api.loadNodes(this.opts.deskId);
    core.store.emit(EVENTS.server.loaded, snapshot);
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
  private async save(): Promise<void> {
    if (this.isSaving || this.dirtyNodes.size === 0) return;
    this.isSaving = true;

    const snapshot = Array.from(this.dirtyNodes)
      .filter((n) => n._id !== "")
      .map((node) => toDB(node));

    this.dirtyNodes.clear();
    try {
      await api.saveNodes(snapshot);
    } catch (err) {
      // при ошибке возвращаем ноды обратно в dirty
      // snapshot.forEach((n) => this.dirtyNodes.add(n._id || ""));
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
  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}
