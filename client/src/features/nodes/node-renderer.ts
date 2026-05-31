import type { INode } from "@shared/types";

import "./vNode.scss";
import { VNode } from "./VNode";
import VTextEdit from "./VTextEdit";
import { core, EVENTS } from "../core/core";
import { NODE_REGISTRY } from "./node-registry";

export class NodeRenderer {
  elements: Map<string, VNode> = new Map();
  private unsubscribers: Array<() => void> = [];

  private nodesEl!: HTMLElement;

  // Вызывается после создания элемента — используется для авто-входа в редактирование
  // onNodeCreated?: (id: string) => void;

  init() {
    this.nodesEl = core.desk.nodesEl;
    core.store.on(EVENTS.renderer.refreshAll, () => {
      this.renderAll();
    });

    core.store.on(EVENTS.nodes.created, (node) => {
      const vNode = this.createElement(node);

      if (vNode instanceof VTextEdit) {
        vNode.turnOn_EditTitleMode();
        vNode.elTitle.focus();
      }
    });
  }

  // bindStore() {
  //   this.unsubscribers = [
  // Core.store.on(EVENTS.Created, (node: INode) => {
  //     this.createElement(node);
  //     // this.onNodeCreated?.(node._id);
  // }),
  // // this.store.on(NODE_EVENTS.Moved,   (node) => this.updatePosition(node)),
  // // this.store.on(NODE_EVENTS.Updated, (node) => this.updateText(node)),
  // Core.store.on(NODE_EVENTS.Deleted, ({ id }) => this.removeElement(id)),
  //   ];
  // }

  createElement(nodeEss: INode): VNode {
    const NodeClass = NODE_REGISTRY[nodeEss.type || 1]!;
    const vNode = new NodeClass(nodeEss, this.nodesEl);
    vNode.init();
    this.elements.set(nodeEss._id || "", vNode);
    return vNode;
  }
  removeElement(id: string) {
    const el = this.elements.get(id);
    if (!el) return;
    el.remove();
    this.elements.delete(id);
  }
  renderAll() {
    core.nodeManager.nodes.forEach((node) => {
      this.createElement(node);
    });
  }
  getElement(id: string): VNode | undefined {
    return this.elements.get(id);
  }
  destroy() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.elements.clear();
  }
}
