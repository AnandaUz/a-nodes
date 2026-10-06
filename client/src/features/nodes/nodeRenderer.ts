import "./VNode/vNode.scss";
import { VNode } from "./VNode/VNode";
import { core, EVENTS } from "../core/core";
import type { LNode } from "@/features/nodes/LNode/LNode";

export class NodeRenderer {
  // private vNodes = new Map<string, VNode>();

  private nodesEl!: HTMLElement;
  unsubscribers: (() => void)[] = [];
  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    // this.vNodes.forEach((vnode) => vnode.remove());
    // this.vNodes.clear();
  }

  init() {
    this.nodesEl = core.desk.nodesEl;
    this.unsubscribers.push(
      core.store.on(EVENTS.node.created, (node: LNode) => {
        this.createVNode(node);
      }),
      // core.store.on(EVENTS.node.inTrash, (node: LNode) => {
      //   this.removeVNode(node._id || "");
      // }),
      // core.store.on(EVENTS.node.ok, (node) => {
      //   this.removeVNode(node._id || "");
      // }),
    );
  }

  createVNode(node: LNode): VNode | null {
    const NodeClass = node.getVNodeType();
    try {
      const vNode = new NodeClass(node, this.nodesEl);
      node.vNode = vNode;
      vNode.init();
      vNode.render();
      vNode.refreshBodyRect();
      // this.vNodes.set(node._id || "", vNode);
      return vNode;
    } catch (e) {
      console.error("Ошибка рендеринга ноды:", node, e);
      return null;
    }
  }

  renderAll() {
    core.nodeManager.nodes.forEach((node) => {
      if (!node.visible) return;
      this.createVNode(node);
    });
    console.log("количество нод", core.nodeManager.nodes.size);

    core.store.emit(EVENTS.renderer.refreshAllVNodes, undefined);
  }
  // getVNode(id: string | undefined): VNode | undefined {
  //   if (!id) return undefined;
  //   return this.vNodes.get(id);
  // }
  // getAlnodes() {
  //   return Array.from(this.vNodes.values());
  // }
  /**
   * Сдвигает вниз все ноды, которые перекрывают заданную область.
   * @param rect - область, которую нужно освободить от нод
   * @param exNodes - ноды, которые не нужно сдвигать (исключения)
   */
  pushdown_nodes_out_of_rect(out_of_rect: DOMRect, exNodes: LNode[] = []) {
    if (out_of_rect.height === 0) return;
    /*
    const exSet = new Set<LNode>(exNodes); // Set вместо массива — поиск O(1)
    const mRes: LNode[] = [];

    const overNodes = core.selectManager.getNodeOverRect(out_of_rect);
    const firstNode = overNodes
      .filter((n) => !exSet.has(n) && !(n instanceof VFrame))
      .sort((a, b) => a.y - b.y)[0];
    if (!firstNode) return;

    const firstNodeRect = firstNode.bodyRect;
    const dy = out_of_rect.height - (firstNodeRect.y - out_of_rect.y);
    if (dy <= 0) return;

    const collect = (node: VNode) => {
      if (node instanceof VFrame) return;
      if (exSet.has(node)) return;
      exSet.add(node);
      mRes.push(node);

      const r = node.bodyRect;

      const w1 = out_of_rect.width;
      const w2 = r.x - out_of_rect.x + r.width;

      const rect = {
        x: out_of_rect.x,
        y: r.y + r.height,
        width: Math.max(w1, w2), // переопределяем
        height: dy,
      } as DOMRect;

      core.selectManager.getNodeOverRect(rect).forEach(collect);
    };

    core.selectManager.getNodeOverRect(out_of_rect).forEach(collect);

    mRes
      .sort((a, b) => a.node.y - b.node.y)
      .forEach((node) => {
        // node.moveAniTo(null, node.node.y + dy);
        node.moveTo({ x: undefined, y: node.node.y + dy });
      });
      */
  }
}
