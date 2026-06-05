import type { INode } from "@shared/types";
import "./vNode.scss";
import { VNode } from "./VNode";
import { core, EVENTS } from "../core/core";
import { NODE_REGISTRY } from "./node-registry";

export class NodeRenderer {
  private vNodes = new Map<string, VNode>();

  private nodesEl!: HTMLElement;
  unsubscribers: (() => void)[] = [];
  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.vNodes.forEach((vnode) => vnode.remove());
    this.vNodes.clear();
  }

  init() {
    this.nodesEl = core.desk.nodesEl;
    this.unsubscribers.push(
      core.store.on(EVENTS.NodeManager.reInitAllNodes, () => {
        this.renderAll();
      }),
      core.store.on(EVENTS.nodes.created, (node) => {
        this.createVNode(node);
      }),
      core.store.on(EVENTS.nodes.deleted, (node) => {
        this.removeVNode(node._id || "");
      }),
    );
  }

  createVNode(nodeEss: INode): VNode {
    const NodeClass = NODE_REGISTRY[nodeEss.type || 1]!;
    const vNode = new NodeClass(nodeEss, this.nodesEl);
    vNode.init();
    vNode.render();
    this.vNodes.set(nodeEss._id || "", vNode);
    return vNode;
  }
  removeVNode(id: string) {
    const el = this.vNodes.get(id);
    if (!el) return;
    el.remove();
    this.vNodes.delete(id);
  }
  renderAll() {
    core.nodeManager.getAllNodes().forEach((node) => {
      this.createVNode(node);
    });
    core.store.emit(EVENTS.renderer.refreshAllVNodes, undefined);
  }
  getVNode(id: string): VNode | undefined {
    return this.vNodes.get(id);
  }
  getAllNodes() {
    return Array.from(this.vNodes.values());
  }
}
