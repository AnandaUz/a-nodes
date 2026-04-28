import type { INode } from '@shared/types';

import { NODE_EVENTS } from '../events';
import './node.scss';
import { VNode } from './VNode';
import { Core } from '../core/core';

export class NodeRenderer {

    private elements: Map<string, VNode> = new Map();
    private unsubscribers: Array<() => void> = [];

    // Вызывается после создания элемента — используется для авто-входа в редактирование
    // onNodeCreated?: (id: string) => void;

    constructor() {
       
        
    }

    // ─── Store ────────────────────────────────────────────────────

    bindStore() {
        this.unsubscribers = [
            Core.store.on(NODE_EVENTS.Created, (node: INode) => {
                this.createElement(node);
                // this.onNodeCreated?.(node._id);
            }),
            // this.store.on(NODE_EVENTS.Moved,   (node) => this.updatePosition(node)),
            // this.store.on(NODE_EVENTS.Updated, (node) => this.updateText(node)),
            Core.store.on(NODE_EVENTS.Deleted, ({ id }) => this.removeElement(id)),
        ];
    }

    // ─── Create ───────────────────────────────────────────────────

    createElement(node: INode): VNode {

        const vNode = new VNode(node);
       
        this.elements.set(node._id, vNode);

        return vNode;
    }

    
    // ─── Delete ───────────────────────────────────────────────────

    removeElement(id: string) {
        const el = this.elements.get(id);
        if (!el) return;
        el.remove();
        this.elements.delete(id);
    }

    // ─── Public ───────────────────────────────────────────────────

    renderAll() {
        // this.store.getAllNodes().forEach(node => this.createElement(node));
    }

    getElement(id: string): VNode | undefined {
        return this.elements.get(id);
    }

    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.elements.clear();
    }
}
