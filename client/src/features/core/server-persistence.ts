// import type { INode } from "@shared/types";
import api from "@/features/core/api";
import { core, EVENTS } from "./core";
import type { LNode } from "@shared/types/LNode";

interface ServerPersistenceOptions {
  apiUrl: string; // например '/api/desks'
  deskId: string;
  token?: string | undefined; // JWT из твоей auth-системы
}

export class ServerPersistence {
  private opts: ServerPersistenceOptions;

  data: LNode[] = [];
  private dirtyNodes: Set<LNode> = new Set();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: Array<() => void> = [];
  private isSaving = false;

  private readonly DEBOUNCE_MS = 1000; // серверу даём чуть больше времени

  constructor(opts: ServerPersistenceOptions) {
    this.opts = opts;

    this.unsubscribers = [
      core.store.on(EVENTS.lNode.updated, (lNode) => {
        this.updateNode(lNode);
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
  async createNode(lNode: LNode): Promise<string> {
    if (this.opts.deskId !== "root") {
      lNode.pageId = this.opts.deskId;
    }
    const _ids = await api.saveNodes([lNode]);
    if (!_ids || _ids.length === 0) return "";
    lNode._id = _ids[0] || "";
    this.data.push(lNode);
    return lNode._id;
  }
  async updateNode(lNode: LNode): Promise<void> {
    // const now = ;
    // let node = this.data.find((n) => n._id === lNode._id);

    // if (node !== undefined) {
    //   let index = this.data.indexOf(node);
    //   node = { ...this.data[index], ...lNode, lastUpdate: now };
    //   this.data[index] = node;
    // } else {
    //   node = { ...lNode, lastUpdate: now };
    //   this.data.push(node);
    // }
    lNode.lastUpdate = new Date();
    if (!this.dirtyNodes.has(lNode)) this.dirtyNodes.add(lNode);
    this.scheduleSave();
  }
  private async save(): Promise<void> {
    if (this.isSaving || this.dirtyNodes.size === 0) return;
    this.isSaving = true;

    const snapshot = Array.from(this.dirtyNodes).map((lNode) => lNode.toDB());
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
    }, this.DEBOUNCE_MS);
  }
  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}
