import { core } from "@features/core/core";
import { store as fallbackStore, type DeskEvents } from "@features/core/store";

export abstract class DisposableComponent extends HTMLElement {
  private disposables: Array<() => void> = [];
  private abortController: AbortController | null = null;

  protected onStore<K extends keyof DeskEvents>(
    event: K,
    handler: (payload: DeskEvents[K]) => void,
  ): () => void {
    const activeStore = core?.store ?? fallbackStore;
    const unsubscribe = activeStore.on(event, handler);
    this.disposables.push(unsubscribe);
    return unsubscribe;
  }

  protected listen<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    handler: (ev: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  protected listen<K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    handler: (ev: DocumentEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  protected listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    event: K,
    handler: (ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  protected listen(
    target: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  protected listen(
    target: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject | ((ev: any) => void),
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }

    const listenerOptions: AddEventListenerOptions =
      typeof options === "boolean"
        ? { capture: options, signal: this.abortController.signal }
        : { ...options, signal: this.abortController.signal };

    const listener = handler as EventListenerOrEventListenerObject;
    target.addEventListener(event, listener, listenerOptions);

    return () => {
      target.removeEventListener(event, listener, options);
    };
  }

  protected addDisposable(dispose: () => void): void {
    this.disposables.push(dispose);
  }

  protected disposeAll(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    for (const dispose of this.disposables) {
      dispose();
    }
    this.disposables = [];
  }

  disconnectedCallback(): void {
    this.disposeAll();
  }
}

