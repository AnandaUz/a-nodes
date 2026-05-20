// import { EVENTS } from "../events";
import { Store, type DeskSnapshot } from "./store";

export class LocalPersistence {
  private store: Store;
  private storageKey: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: Array<() => void> = [];

  // Задержка перед сохранением — чтобы не писать в storage на каждый пиксель drag
  private readonly DEBOUNCE_MS = 500;

  constructor(store: Store, deskId: string) {
    this.store = store;
    this.storageKey = `desk:${deskId}`;
  }

  // Загружает сохранённое состояние и подписывается на изменения
  init(): void {
    this.load();
    this.bindStore();
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const snapshot = JSON.parse(raw) as DeskSnapshot;
      this.store.loadSnapshot(snapshot);
    } catch (err) {
      console.warn("[LocalPersistence] Не удалось загрузить состояние:", err);
    }
  }
  private save(): void {
    try {
      const snapshot = this.store.getSnapshot();
      localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (err) {
      console.warn("[LocalPersistence] Не удалось сохранить состояние:", err);
    }
  }

  // Debounce — откладываем сохранение пока события идут часто
  private scheduleSave(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.save();
      this.debounceTimer = null;
    }, this.DEBOUNCE_MS);
  }

  // ─── Store subscription ───────────────────────────────────────

  private bindStore(): void {
    const save = () => this.scheduleSave();

    // this.unsubscribers = [
    //     this.store.on(EVENTS.nodes.created,      save),
    //     // this.store.on(EVENTS.nodes.moved,        save),
    //     this.store.on(EVENTS.nodes.updated,      save),
    //     this.store.on(EVENTS.nodes.deleted,      save),
    // ];
  }

  // ─── Clear / Destroy ──────────────────────────────────────────

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  destroy(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.unsubscribers.forEach((unsub) => unsub());
  }
}
