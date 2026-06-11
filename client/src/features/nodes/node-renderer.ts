import type { INode } from "@shared/types";
import "./vNode.scss";
import { VNode } from "./VNode";
import { core, EVENTS } from "../core/core";
import { NODE_REGISTRY } from "./node-registry";
import VM_area from "./VManager/VM_area";

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
  moveOverNodes(overRect: DOMRect, dy0: number, exNodes: VNode[] = []) {
    if (dy0 === 0) return;

    const exSet = new Set<VNode>(exNodes); // Set вместо массива — поиск O(1)
    const mRes: VNode[] = [];

    const collect = (node: VNode) => {
      if (node instanceof VM_area) return;
      if (exSet.has(node)) return;
      exSet.add(node);
      mRes.push(node);

      const r = node.body.getBoundingClientRect();
      const rect = {
        x: r.x,
        y: r.y,
        width: 200, // переопределяем
        height: r.height,
      } as DOMRect;

      rect.height += overRect.height + 50;

      core.selectManager.getNodeOverRect(rect).forEach(collect);
    };

    core.selectManager.getNodeOverRect(overRect).forEach(collect);

    mRes
      .sort((a, b) => a.y - b.y)
      .forEach((node, i) => {
        node.moveAniTo(null, node.y + dy0, i * 50);
      });
  }
}
