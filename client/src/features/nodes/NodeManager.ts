import type { INode } from "@shared/types/INode";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";
import Tools from "../core/Tools";
import VTextEdit from "./VTextEdit";

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

  async copyNode(
    nodeEss: INode,
    options?: Partial<INode>,
  ): Promise<INode | null> {
    const { _id, ...rest } = nodeEss;

    const newNodeEss: INode = {
      ...rest,
      x: options?.x ?? rest.x!,
      y: options?.y ?? rest.y!,
      title: options?.title ?? rest.title ?? "",
    };
    newNodeEss.x = Math.round(newNodeEss.x!);
    newNodeEss.y = Math.round(newNodeEss.y!);
    const id = await core.serverPersistence.createNode(newNodeEss);

    if (!id) return null;

    this.nodes.set(id, newNodeEss);
    core.store.emit(EVENTS.nodes.created, newNodeEss);
    return newNodeEss;
  }
  async createNodeWithTypeAndPositionFromCursor(type: number) {
    const { x, y } = core.desk.viewport.screenToWorld(
      core.desk.mouse.x,
      core.desk.mouse.y,
    );
    const newNodeEss: INode = {
      x: Math.round(x),
      y: Math.round(y),
      type,
    };
    const newNode = await this.createNode(newNodeEss); //создание текстовой ноды
    if (newNode) {
      const vnode = core.nodeRenderer.getVNode(newNode._id || "");
      core.selectManager.selectNodyById(newNode._id || "");
      if (vnode instanceof VTextEdit) {
        vnode.turnOn_EditTitleMode();
      }
    }
  }
  async createNode(nodeEss: INode): Promise<INode | null> {
    nodeEss.x = Math.round(nodeEss.x!);
    nodeEss.y = Math.round(nodeEss.y!);
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
    this.saveNode(nodeEss);
  }
  saveNode(nodeEss: INode) {
    core.store.emit(EVENTS.nodes.updated, nodeEss);
  }
  okNode(id: string): void {
    if (!this.nodes.has(id)) return;

    const nodeEss = this.nodes.get(id)!;
    nodeEss.ok = true;

    if (nodeEss.exData?.repeatMode) {
      const nextDate = Tools.getNextWeekday(
        parseInt(nodeEss.exData.repeatMode),
      );
      nextDate.setHours(0, 0, 0, 0);
      nodeEss.exData.repeatDay = nextDate;
    }
    this.saveNode(nodeEss);
    core.store.emit(EVENTS.nodes.deleted, nodeEss);
    this.nodes.delete(id);
  }
  putInTrashNode(id: string): void {
    if (!this.nodes.has(id)) return;

    const nodeEss = this.nodes.get(id)!;
    nodeEss.inTrash = true;
    if (nodeEss.exData?.repeatMode) {
      const nextDate = Tools.getNextWeekday(
        parseInt(nodeEss.exData.repeatMode),
      );
      nextDate.setHours(0, 0, 0, 0);
      nodeEss.exData.repeatDay = nextDate;
    }
    this.saveNode(nodeEss);
    core.store.emit(EVENTS.nodes.deleted, nodeEss);
    this.nodes.delete(id);
  }
  async addTextEditNode_byEnter(e: KeyboardEvent) {
    Tools.stopEvent(e);

    if (core.mode.selectedVNodeCount !== 1) return;
    if (!core.mode.textEditing) return;

    const vNode = core.selectManager.selectedNodes.values().next()
      .value as VTextEdit;
    const title = vNode.nodeEss.title || "";

    // пустая нода — просто сдвигаем вниз
    if (!title) {
      vNode.moveAniTo(null, (vNode.nodeEss.y ?? 0) + 25);
      return;
    }

    // позиция курсора
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const cursorIndex = Tools.getCursorIndex(vNode.titleEl, range);

    // делим текст по курсору
    const leftText = title.slice(0, cursorIndex).trimEnd();
    const rightText = title.slice(cursorIndex).trimStart();

    vNode.title = leftText;
    vNode.render();
    vNode.save();
    // vNode.saveTitle();

    // создаём новую ноду с правым текстом
    const newNode = await this.copyNode(vNode.nodeEss, {
      x: vNode.x,
      y: vNode.y + vNode.body.offsetHeight * 0.8,
      title: rightText,
    });

    vNode.turnOff_EditTitleMode();
    core.selectManager.clearSelection();

    const newVnode = core.selectManager.selectNodyById(
      newNode?._id || "",
    ) as VTextEdit;
    newVnode?.onStop();
    if (newVnode) {
      newVnode.turnOn_EditTitleMode();
    }
  }
}
