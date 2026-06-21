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
      core.store.on(EVENTS.nodes.inTrash, (node) => {
        this.removeVNode(node._id || "");
      }),
      core.store.on(EVENTS.nodes.ok, (node) => {
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
  /**
   * Сдвигает вниз все ноды, которые перекрывают заданную область.
   * @param rect - область, которую нужно освободить от нод
   * @param exNodes - ноды, которые не нужно сдвигать (исключения)
   */
  pushdown_nodes_out_of_rect(out_of_rect: DOMRect, exNodes: VNode[] = []) {
    if (out_of_rect.height === 0) return;

    const exSet = new Set<VNode>(exNodes); // Set вместо массива — поиск O(1)
    const mRes: VNode[] = [];

    const overNodes = core.selectManager.getNodeOverRect(out_of_rect);
    const firstNode = overNodes
      .filter((n) => !exSet.has(n) && !(n instanceof VM_area))
      .sort((a, b) => a.y - b.y)[0];
    if (!firstNode) return;

    const firstNodeRect = firstNode.bodyRect;
    const dy = out_of_rect.height - (firstNodeRect.y - out_of_rect.y);
    if (dy <= 0) return;

    const collect = (node: VNode) => {
      if (node instanceof VM_area) return;
      if (exSet.has(node)) return;
      exSet.add(node);
      mRes.push(node);

      const r = node.bodyRect;
      const rect = {
        x: out_of_rect.x,
        y: r.y + r.height,
        width: 200, // переопределяем
        height: dy,
      } as DOMRect;

      core.selectManager.getNodeOverRect(rect).forEach(collect);
    };

    core.selectManager.getNodeOverRect(out_of_rect).forEach(collect);

    mRes
      .sort((a, b) => a.y - b.y)
      .forEach((node, i) => {
        node.moveAniTo(null, node.y + dy, i * 50);
      });
  }
}
