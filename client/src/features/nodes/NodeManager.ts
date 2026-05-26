import type { INode } from "@shared/types/desk";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";

export class NodeManager {
  nodes = new Map<string, INode>();

  init() {
    core.store.on(EVENTS.server.loaded, (snapshot) => {
      this.loadSnapshot(snapshot);
    });

    core.store.on(EVENTS.nodes.updated, (node) => {
      core.serverPersistence.updateNode(node);
      core.serverPersistence.scheduleSave();
    });
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    this.nodes.clear();
    for (const node of snapshot.nodes) {
      const { _id } = node;
      if (!_id) continue;
      this.nodes.set(_id, node);
    }
    core.store.emit(EVENTS.renderer.refreshAll, undefined);
  }

  async createNode(type: number = 1, x: number = 0, y: number = 0): Promise<INode | null> {
    const nodeEss: INode = {
      x,
      y,
      type,
    };

    const id = await core.serverPersistence.createNode(nodeEss);

    if (!id) return null;

    this.nodes.set(id, nodeEss);
    core.store.emit(EVENTS.nodes.created, nodeEss);
    return nodeEss;
  }
  getNode(_id: string): INode | undefined {
    return this.nodes.get(_id);
  }

  getAllNodes(): INode[] {
    return Array.from(this.nodes.values());
  }
  // move(_id: string, x: number, y: number): void {
  //   const node = this.nodes.get(_id);
  //   if (!node) return;
  //   node.x = x;
  //   node.y = y;
  //   this.core.store.emit(EVENTS.nodes.moved, { ...node });
  // }

  // updateNode(_id: string, node: INode): void {
  //   const exNode = this.nodes.get(_id);
  //   if (!exNode) return;
  //   exNode.x = node.x ?? 0;
  //   exNode.y = node.y ?? 0;
  //   exNode.lastUpdate = new Date();
  //   this.core.store.emit(EVENTS.nodes.updated, { ...exNode });
  // }

  deleteNode(id: string): void {
    if (!this.nodes.has(id)) return;
    this.nodes.delete(id);
    core.store.emit(EVENTS.nodes.deleted, { id });
  }
}
