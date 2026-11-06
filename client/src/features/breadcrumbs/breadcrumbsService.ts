import type { BreadcrumbItem } from "@/features/core/interfaces";

export type BreadcrumbsListener = (items: BreadcrumbItem[]) => void;

class BreadcrumbsService {
  private items: BreadcrumbItem[] = [];
  private listeners: Set<BreadcrumbsListener> = new Set();

  getItems(): BreadcrumbItem[] {
    return [...this.items];
  }

  setItems(items: BreadcrumbItem[]): void {
    this.items = [...items];
    this.notify();
  }

  pushItem(item: BreadcrumbItem): void {
    const existingIndex = this.items.findIndex((it) => it.id === item.id);
    if (existingIndex !== -1) {
      this.items = this.items.slice(0, existingIndex + 1);
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    this.notify();
  }

  updateItemTitle(id: string, title: string): void {
    let changed = false;
    this.items = this.items.map((item) => {
      if (item.id === id && item.title !== title) {
        changed = true;
        return { ...item, title };
      }
      return item;
    });
    if (changed) {
      this.notify();
    }
  }

  clear(): void {
    if (this.items.length === 0) return;
    this.items = [];
    this.notify();
  }

  subscribe(listener: BreadcrumbsListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getItems();
    this.listeners.forEach((fn) => fn(current));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("breadcrumbs:updated", { detail: current }),
      );
    }
  }
}

export const breadcrumbsService = new BreadcrumbsService();

