// import { store, type DeskSnapshot } from "./store";

import type { INode } from "@shared/types";
import api from "@/features/core/api";
// import type { DeskSnapshot } from "./interfaces";
import { core, EVENTS } from "./core";

interface ServerPersistenceOptions {
  apiUrl: string; // например '/api/desks'
  deskId: string;
  token?: string | undefined; // JWT из твоей auth-системы
}

export class ServerPersistence {
  private opts: ServerPersistenceOptions;

  data: INode[] = [];
  private dirtyNodes: Set<string> = new Set();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  // private unsubscribers: Array<() => void> = [];
  private isSaving = false;

  private readonly DEBOUNCE_MS = 1000; // серверу даём чуть больше времени

  constructor(opts: ServerPersistenceOptions) {
    this.opts = opts;
  }
  async init(): Promise<void> {
    await this.load();
    // this.bindStore();
  }
  private async load(): Promise<void> {
    const snapshot = await api.loadNodes();
    core.store.emit(EVENTS.server.loaded, snapshot);
  }

  // ─── Save ─────────────────────────────────────────────────────
  // private async saveNode(data: INode): Promise<void> {
  //   if (this.isSaving) return;
  //   this.isSaving = true;

  //   try {
  //     const nodes = { nodes: [data] };
  //     // await fetchWithAuth(this.opts.apiUrl+'/saveNodes', {
  //     //     method: 'PUT',
  //     //     body: JSON.stringify(nodes),
  //     // });
  //   } catch (err) {
  //     console.warn("[saveNode] Ошибка сохранения:", err);
  //   } finally {
  //     this.isSaving = false;
  //   }
  // }
  async createNode(node: INode): Promise<string> {
    const _id = await api.saveNodes([node]);
    node._id = _id;
    this.data.push(node);
    return _id;
  }
  async updateNode(node: INode): Promise<void> {
    const now = new Date();
    const index = this.data.findIndex((n) => n._id === node._id);

    let _node: INode;
    if (index === -1) {
      _node = { ...node, lastUpdate: now };
      this.data.push(_node);
    } else {
      _node = { ...this.data[index], ...node, lastUpdate: now };
      this.data[index] = _node;
    }

    if (_node._id) this.dirtyNodes.add(_node._id);
    this.scheduleSave();
  }
  private async save(): Promise<void> {
    if (this.isSaving || this.dirtyNodes.size === 0) return;
    this.isSaving = true;

    const snapshot = this.data.filter((n) => this.dirtyNodes.has(n._id || ""));
    this.dirtyNodes.clear();

    try {
      await api.saveNodes(snapshot);
    } catch (err) {
      // при ошибке возвращаем ноды обратно в dirty
      snapshot.forEach((n) => this.dirtyNodes.add(n._id || ""));
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

  // ─── Store subscription ───────────────────────────────────────

  // private bindStore(): void {
  //   const save = (data: any) => this.scheduleSave(data);
  //   const saveNode = (data: any) => this.saveNode(data);

  //   // this.unsubscribers = [
  //   //     this.store.on(NODE_EVENTS.Created,      saveNode),
  //   //     // this.store.on(NODE_EVENTS.Moved,        save),
  //   //     this.store.on(NODE_EVENTS.Updated,      save),
  //   //     this.store.on(NODE_EVENTS.Deleted,      save),
  //   // ];
  // }
}
