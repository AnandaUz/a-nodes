import type { INode } from "@shared/types/INode";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";

export class NodeManager {
  private nodes = new Map<string, INode>();
  pageNode: INode | undefined;
  private unsubscribers: (() => void)[] = [];

  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.nodes.clear();
  }

  init() {
    this.unsubscribers.push(
      core.store.on(EVENTS.server.loaded, (snapshot) => {
        this.loadSnapshot(snapshot);
      }),
      core.store.on(EVENTS.nodes.updated, (nodeEss) => {
        core.serverPersistence.updateNode(nodeEss);
      }),
    );
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    this.nodes.clear();
    for (const node of snapshot.nodes) {
      const { _id } = node;
      if (!_id) continue;
      this.nodes.set(_id, node);
    }
    if (snapshot.pageNode) {
      this.pageNode = snapshot.pageNode;
    }
    core.store.emit(EVENTS.NodeManager.reInitAllNodes, undefined);
  }

  async createNode(nodeEss: INode): Promise<INode | null> {
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
  moveToNode(nodeEss: INode, x: number, y: number): void {
    nodeEss.x = x;
    nodeEss.y = y;
    core.store.emit(EVENTS.nodes.updated, nodeEss);
  }

  // updateNode(_id: string, node: INode): void {
  //   const exNode = this.nodes.get(_id);
  //   if (!exNode) return;
  //   exNode.x = node.x ?? 0;
  //   exNode.y = node.y ?? 0;
  //   exNode.lastUpdate = new Date();
  //   this.core.store.emit(EVENTS.nodes.updated, { ...exNode });
  // }
  okNode(id: string): void {
    if (!this.nodes.has(id)) return;

    const nodeEss = this.nodes.get(id)!;
    nodeEss.ok = true;
    core.store.emit(EVENTS.nodes.updated, nodeEss);
    core.store.emit(EVENTS.nodes.deleted, nodeEss);
    this.nodes.delete(id);
  }
  deleteNode(id: string): void {
    if (!this.nodes.has(id)) return;

    const nodeEss = this.nodes.get(id)!;
    nodeEss.inTrash = true;
    core.store.emit(EVENTS.nodes.updated, nodeEss);
    core.store.emit(EVENTS.nodes.deleted, nodeEss);
    this.nodes.delete(id);
  }
}
