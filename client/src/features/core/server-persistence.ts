import { Store, type DeskSnapshot } from './store';
import { fetchWithAuth } from '@services/api';
import { NODE_EVENTS } from '@features/events';
import type { INode } from '@shared/types';

interface ServerPersistenceOptions {
    apiUrl:  string;  // например '/api/desks'
    deskId:  string;
    token?:  string | undefined;  // JWT из твоей auth-системы
}

export class ServerPersistence {
    private store:   Store;
    private opts:    ServerPersistenceOptions;

    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private unsubscribers: Array<() => void> = [];
    private isSaving = false;

    private readonly DEBOUNCE_MS = 1000; // серверу даём чуть больше времени

    constructor(store: Store, opts: ServerPersistenceOptions) {
        this.store = store;
        this.opts  = opts;
    }

    // ─── Init ─────────────────────────────────────────────────────

    async init(): Promise<void> {
        await this.load();
        this.bindStore();
    }

    // ─── Load ─────────────────────────────────────────────────────

    private async load(): Promise<void> {
        try {
            const res = await fetchWithAuth(this.url());

            if (!res.ok) {
                console.warn('[ServerPersistence] Ошибка загрузки:', res.status);
                return;
            }

            const snapshot = await res.json() as DeskSnapshot;
            this.store.loadSnapshot(snapshot);
        } catch (err) {
            console.warn('[ServerPersistence] Нет соединения с сервером:', err);
        }
    }

    // ─── Save ─────────────────────────────────────────────────────
    private async saveNode(data: INode): Promise<void> {
        if (this.isSaving) return;
        this.isSaving = true;

        try {             
            const nodes = {nodes: [data]};        
            await fetchWithAuth(this.opts.apiUrl+'/saveNodes', {
                method: 'PUT',
                body: JSON.stringify(nodes),
            });
        } catch (err) {
            console.warn('[saveNode] Ошибка сохранения:', err);
        } finally {
            this.isSaving = false;
        }
    }
    // private async save(data: any): Promise<void> {
    //     if (this.isSaving) return;
    //     this.isSaving = true;

    //     try {
    //         const snapshot = this.store.getSnapshot();            

    //         await fetchWithAuth(this.url(), {
    //             method: 'PUT',
    //             body: JSON.stringify(snapshot),
    //         });
    //     } catch (err) {
    //         console.warn('[ServerPersistence] Ошибка сохранения:', err);
    //     } finally {
    //         this.isSaving = false;
    //     }
    // }

    private scheduleSave(data: any): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            // void this.save(data);
            this.debounceTimer = null;
        }, this.DEBOUNCE_MS);
    }

    // ─── Store subscription ───────────────────────────────────────

    private bindStore(): void {
        const save = (data: any) => this.scheduleSave(data);
        const saveNode = (data: any) => this.saveNode(data);

        this.unsubscribers = [
            this.store.on(NODE_EVENTS.Created,      saveNode),
            // this.store.on(NODE_EVENTS.Moved,        save),
            this.store.on(NODE_EVENTS.Updated,      save),
            this.store.on(NODE_EVENTS.Deleted,      save),
        ];
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private url(): string {
        return `${this.opts.apiUrl}/${this.opts.deskId}`;
    }

    // ─── Destroy ──────────────────────────────────────────────────

    destroy(): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.unsubscribers.forEach(unsub => unsub());
    }
}
