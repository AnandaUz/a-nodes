type Listener<T> = (payload: T) => void;

export class EventEmitter<TEvents extends Record<string, unknown>> {
    private listeners: {
        [K in keyof TEvents]?: Set<Listener<TEvents[K]>>;
    } = {};

    on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event]!.add(listener);

        // Возвращаем функцию отписки — удобно для cleanup
        return () => this.off(event, listener);
    }

    off<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): void {
        this.listeners[event]?.delete(listener);
    }

    emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
        this.listeners[event]?.forEach(fn => fn(payload));
    }
}
