import { EventEmitter } from './event-emitter';

import { ObjectId } from 'bson';
import type { INode } from '@shared/types';
import { NODE_EVENTS, type DeskEvents } from '@features/events';

import {Core } from './core';
import type { VNode } from '../nodes/VNode';

function generateId(): string {
    return new ObjectId().toHexString();
}

export interface DeskSnapshot {
    nodes:      INode[];
}
export class Store extends EventEmitter<DeskEvents>
 {
    private nodes:      Map<string, INode>      = new Map();   

    // ─── Snapshot ─────────────────────────────────────────────────

    // Возвращает полное состояние стола — для сохранения
    getSnapshot(): DeskSnapshot {
        return {
            nodes:      this.getAllNodes(),            
        };
    }

    // Загружает состояние и эмитит события — рендер обновится сам
    loadSnapshot(snapshot: DeskSnapshot): void {
        // this.nodes.clear();
        // this.connectors.clear();

        for (const data of (snapshot.nodes as INode[])) {

            if (this.nodes.has(data._id)) {
                const exNode = this.nodes.get(data._id)!;
                if (data.lastUpdate && exNode.lastUpdate && exNode.lastUpdate < data.lastUpdate) {
                    this.updateNode(data._id, data);
                    continue;
                }
            } else {

                const node: INode = {
                    _id: data._id || generateId(),
                    x: data.x ?? 0,
                    y: data.y ?? 0,
                    lastUpdate: data.lastUpdate ?? new Date()
                }         
                this.nodes.set(node._id, node);
                this.emit(NODE_EVENTS.Created, { ...node });
            }         
        }        
    }

    // ─── Nodes: Read ──────────────────────────────────────────────

    getNode(_id: string): INode | undefined {
        return this.nodes.get(_id);
    }

    getAllNodes(): INode[] {
        return Array.from(this.nodes.values());
    }

    // ─── Nodes: Write ─────────────────────────────────────────────

    createNode(x: number, y: number): INode {
        const node: INode = {
            _id: generateId(),
            x, y,            
            lastUpdate: new Date(),      
        };
        this.nodes.set(node._id, node);
        this.emit(NODE_EVENTS.Created, { ...node });
        return node;
    }

    moveNode(_id:string,x:number,y:number): void {
        const node = this.nodes.get(_id);
        if (!node) return;
        node.x = x;
        node.y = y;
        this.emit(NODE_EVENTS.Moved, { ...node });
    }

    updateNode(_id:string,node:INode): void {
        const exNode = this.nodes.get(_id);
        if (!exNode) return;
        exNode.x = node.x ?? 0;
        exNode.y = node.y ?? 0;
        exNode.lastUpdate = new Date();
        this.emit(NODE_EVENTS.Updated, { ...exNode });
    }

    deleteNode(id: string): void {
        if (!this.nodes.has(id)) return;
        this.nodes.delete(id);
        this.emit(NODE_EVENTS.Deleted, { id });
      
    }


}
