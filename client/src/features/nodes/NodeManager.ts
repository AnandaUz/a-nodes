import { LNode } from "@shared/types/LNode";

import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";
import Tools from "../core/Tools";
import VTextEdit from "./VTextEdit";
import { NODE_TYPES } from "./node-registry";
import type { VNode } from "./VNode";
// import type { INode } from "@shared/types/INode";

export class NodeManager {
  private nodes = new Map<string, LNode>();
  pageNode: LNode | undefined;
  private unsubscribers: (() => void)[] = [];

  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.nodes.clear();
  }

  init() {
    this.unsubscribers.push(
      core.store.on(EVENTS.lNode.selectedMoved, () => {
        this.onSelectedLNodesMoved();
      }),
    );
  }
  getRectForNodes(nodes: Set<VNode>) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

    nodes.forEach((vNode) => {
      const r = vNode.bodyRect;
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.width);
      y1 = Math.max(y1, r.y + r.height);
    });
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
  }

  onSelectedLNodesMoved() {
    const selectedVNodes = core.selectManager.selectedNodes;
    if (selectedVNodes.size < 1) return;

    //// работа со списком

    let movedVNodeRect: DOMRect;
    let movedVNodes = new Set(selectedVNodes.values());

    const visited = new Set();
    const gather = (node: any) => {
      if (!node || visited.has(node)) return;
      visited.add(node);

      if (node.list?.children) {
        for (const child of node.list.children) {
          if (child.vNode) {
            movedVNodes.add(child.vNode);
          }
          gather(child);
        }
      }
    };
    selectedVNodes.forEach((vNode) => {
      gather(vNode.lNode);
    });

    movedVNodeRect = this.getRectForNodes(movedVNodes);
    // movedVNodes = [...selectedVNodes.values()];

    // const scale = core.mode.scale;
    const overRect = {
      x: movedVNodeRect.x,
      y: movedVNodeRect.y - 1,
      width: movedVNodeRect.width,
      height: movedVNodeRect.height + 1,
    } as DOMRect;

    const candidates = core.selectManager
      .getNodeOverRect(overRect)
      .filter((node) => !movedVNodes.has(node));

    candidates.sort((a, b) => a.lNode.y - b.lNode.y);

    let byNode = candidates?.[0];

    const selectedLNodes: LNode[] = [];
    // оставим только родителей
    const refFunc = (vNode: VNode) => {
      const lNode = vNode.lNode;
      const parentLNode = lNode.list?.parentLNode;
      const parentVNode = parentLNode?.vNode;

      // если нода имеет родителя среди выбранны, но не берём её
      if (parentVNode && selectedVNodes.has(parentLNode._id || "")) return;

      selectedLNodes.push(lNode);
    };
    selectedVNodes.forEach((vNode: VNode) => refFunc(vNode));

    selectedLNodes.sort((a, b) => b.y - a.y); // в обратном порядке

    const wasRef = new Set<LNode>();
    if (byNode) {
      // установим его новым родителем
      const willRefParent: LNode[] = [];
      selectedLNodes.forEach((lNode) => {
        if (overRect.y < byNode.lNode.y) {
          const parentLNode = byNode.lNode.list?.parentLNode;
          const parentVNode = parentLNode?.vNode;
          if (parentVNode) {
            const index = byNode.lNode.list?.index || 0;
            willRefParent.push(
              ...lNode.setNewListParent(parentLNode, index - 0.6),
            );
          }
        } else {
          willRefParent.push(...lNode.setNewListParent(byNode.lNode, 0));
        }
      });

      willRefParent.forEach((lNode) => {
        const mainParent = lNode.getMainListParent();
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);
        mainParent.setPositionForAllLinkedChildNodes();
        mainParent.checkListTree();

        mainParent.save();
      });
    } else {
      const willRefParent: LNode[] = [];
      selectedLNodes.forEach((lNode) => {
        willRefParent.push(...lNode.clearListParent());
      });
      willRefParent.forEach((lNode) => {
        const mainParent = lNode.getMainListParent();
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);
        mainParent.setPositionForAllLinkedChildNodes();
        mainParent.checkListTree();

        mainParent.save();
      });
    }
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    this.nodes.clear();

    for (const node of snapshot.nodes) {
      const { _id } = node;
      if (!_id) continue;
      const lNode = new LNode();
      lNode.fromDB(node);
      this.nodes.set(_id, lNode);
    }

    if (snapshot.pageNode) {
      this.pageNode = new LNode();
      this.pageNode.fromDB(snapshot.pageNode);
    }

    this.initAllLinks();

    core.store.emit(EVENTS.NodeManager.reInitAllNodes, undefined);
  }
  getNodeByLID(lID: number) {
    for (const node of this.nodes.values()) {
      if (node.lID === lID) {
        return node;
      }
    }
    return undefined;
  }
  initAllLinks() {
    for (const node of this.nodes.values()) {
      if (node.list?.parentLID) {
        const parentNode = this.getNodeByLID(node.list.parentLID);
        if (parentNode) {
          if (!parentNode.list) {
            parentNode.list = {};
          }
          if (!parentNode.list.children) {
            parentNode.list.children = new Set<LNode>();
          }
          parentNode.list.children.add(node);
          if (!node.list) {
            node.list = {};
          }
          node.list.parentLNode = parentNode;
        }
      }
    }
  }
  setPositionForAllLinkedChildNodes() {
    for (const node of this.nodes.values()) {
      node.setPositionForAllLinkedChildNodes();
    }
  }

  async copyNode(
    lNode: LNode,
    options?: Partial<LNode>,
  ): Promise<LNode | null> {
    const newLNode = new LNode();

    // то что нужно склонировать из родителя
    newLNode.exData = structuredClone(lNode.exData);

    for (const [key, value] of Object.entries(options || {})) {
      (newLNode as any)[key] = value;
    }

    // newLNode.x = Tools.getDiskPosition(options?.x ?? lNode.x + 20);
    // newLNode.y = options?.y ?? lNode.y;
    // newLNode.title = options?.title ?? lNode.title;

    console.time("save node");
    const id = await core.serverPersistence.createNode(newLNode);
    console.timeEnd("save node");

    if (!id) return null;
    newLNode._id = id;
    this.nodes.set(id, newLNode);

    core.store.emit(EVENTS.lNode.created, newLNode);

    return newLNode;
  }
  async createNodeWithTypeAndPositionFromCursor(type: number) {
    const { x, y } = core.desk.viewport.screenToWorld(
      core.desk.pointer.x,
      core.desk.pointer.y,
    );
    const newLNode = await this.createNode({
      x: Tools.getDiskPosition(x),
      y: Math.round(y),
      type,
    });
    if (newLNode) {
      const vnode = core.nodeRenderer.getVNode(newLNode._id || "");
      core.selectManager.selectNodeById(newLNode._id || "");
      if (vnode instanceof VTextEdit) {
        vnode.turnOn_EditTitleMode();
      }
    }
  }
  async createNode({
    x = 0,
    y = 0,
    type = 0,
  }: {
    x?: number;
    y?: number;
    type?: number;
  }) {
    const lNode = new LNode();
    lNode.x = Tools.getDiskPosition(x);
    lNode.y = Math.round(y);
    lNode.type = type;

    const id = await core.serverPersistence.createNode(lNode);

    if (!id) return null;

    this.nodes.set(id, lNode);
    core.store.emit(EVENTS.lNode.created, lNode);
    return lNode;
  }

  getNode(_id: string) {
    return this.nodes.get(_id);
  }

  getAllNodes(): LNode[] {
    return Array.from(this.nodes.values());
  }
  // moveNodeTo(lNode: LNode, x: number, y: number): void {
  //   if (lNode.x === x && lNode.y === y) return;
  //   lNode.x = x;
  //   lNode.y = y;
  //   this.saveNode(lNode);
  // }
  // saveNode(lNode: INode) {
  //   core.store.emit(EVENTS.lNode.updated, lNode);
  // }
  // okNode(id: string): void {
  //   if (!this.nodes.has(id)) return;

  //   const lNode = this.nodes.get(id)!;
  //   lNode.ok = true;

  //   if (lNode.exData?.repeatMode) {
  //     const nextDate = Tools.getNextWeekday(
  //       parseInt(lNode.exData.repeatMode),
  //     );
  //     nextDate.setHours(0, 0, 0, 0);
  //     lNode.exData.repeatDay = nextDate;
  //   }
  //   this.saveNode(lNode);
  //   core.store.emit(EVENTS.lNode.deleted, lNode);
  //   this.nodes.delete(id);
  // }
  putNodeInTrash(id: string): void {
    const lNode = this.nodes.get(id);
    if (!lNode) return;

    lNode.inTrash = true;
    if (lNode.exData?.repeatMode) {
      const nextDate = Tools.getNextWeekday(parseInt(lNode.exData.repeatMode));
      nextDate.setHours(0, 0, 0, 0);
      lNode.exData.repeatDay = nextDate;
    }
    lNode.save();
    core.store.emit(EVENTS.lNode.inTrash, lNode);
    this.nodes.delete(id);
  }
  async create_TextEditCloneNode(lNode: LNode, x?: number, y?: number) {
    if (!lNode.type) return;

    let vNode: VNode;
    let cloneNodeEss: INode = {
      type: NODE_TYPES.TEXT_EDIT_CLONE.id,
    };
    if (
      lNode.type == NODE_TYPES.TEXT_EDIT.id ||
      lNode.type == NODE_TYPES.TEXT_EDIT_CLONE.id
    ) {
      // ищим главную ноду от которой идут все клоны
      let mainNodeEss = lNode;
      while (mainNodeEss.exData?.ownerNodesIds?.length) {
        mainNodeEss = this.getNode(mainNodeEss.exData.ownerNodesIds[0]!)!;
      }
      //
      vNode = core.nodeRenderer.getVNode(lNode._id || "") as VTextEdit;
      if (!vNode) return;
      cloneNodeEss = {
        ...cloneNodeEss,
        x: x ?? vNode.lNode.x, //+ vNode.width + 20,
        y: y ?? vNode.lNode.y,
        exData: {
          ownerNodesIds: [mainNodeEss._id!],
        },
      };
      if (
        lNode.type == NODE_TYPES.TEXT_EDIT_CLONE.id &&
        cloneNodeEss.exData &&
        lNode.exData?.ownerNodesIds &&
        lNode.exData.ownerNodesIds.length > 0
      ) {
        cloneNodeEss.exData.ownerNodesIds = [lNode.exData.ownerNodesIds[0]!];
      }
    } else return;

    const cloneNode = await this.createNode(cloneNodeEss);
    if (!cloneNode) return null;
    return cloneNode;
  }
  /**
   * получить максимальный lID у всех нод на странице
   * @returns {number}
   */
  getMaxLID() {
    let max = 0;
    for (const node of this.nodes.values()) {
      if (node.lID && node.lID > max) {
        max = node.lID;
      }
    }
    return max;
  }

  async addTextEditNode_byEnter(e: KeyboardEvent) {
    Tools.stopEvent(e);

    if (core.mode.selectedVNodeCount !== 1) return;
    if (!core.mode.textEditing) return;

    const vNode = core.selectManager.selectedNodes.values().next()
      .value as VTextEdit;
    const lNode = vNode.lNode;
    const title = lNode.title || "";

    // пустая нода — просто сдвигаем вниз
    if (!title) {
      vNode.moveAniTo(null, (lNode.y ?? 0) + 25);
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
    vNode.refreshBodyRect();
    vNode.render();
    // добавляем lID
    let parentLID = 1;
    if (lNode.lID) {
      parentLID = lNode.lID;
    } else {
      parentLID = this.getMaxLID() + 1;
      lNode.lID = parentLID;
    }

    lNode.save();

    vNode.turnOff_EditTitleMode();
    core.selectManager.clearSelection();

    // создаём новую ноду с правым текстом
    const newLNode = await this.copyNode(lNode, {
      x: lNode.x,
      y: lNode.y + vNode.height,
      title: rightText,
      lID: undefined,
    });
    if (newLNode) {
      newLNode.setNewListParent(lNode, 0);
    }

    const newVnode = core.selectManager.selectNodeById(
      newLNode?._id || "",
    ) as VTextEdit;
    newVnode?.onStop();
    if (newVnode) {
      newVnode.turnOn_EditTitleMode();
    }
  }
}
