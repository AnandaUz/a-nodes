import { LNode } from "@/features/nodes/LNode/LNode";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";
import Tools from "../core/Tools";
import VTextEdit from "./VTextEdit";
import { NODE_REGISTRY, NODE_TYPES } from "./node-registry";
import { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import { LNode_TEClone } from "./LNode/LNode_TEClone";

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
      core.store.on(EVENTS.node.selectedMoved, () => {
        this.onSelectedNodesMoved();
      }),
    );
  }
  getRectForNodes(nodes: Set<LNode>) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

    nodes.forEach((node) => {
      const vNode = node.vNode;
      if (!vNode) return;
      const r = vNode.bodyRect;
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.width);
      y1 = Math.max(y1, r.y + r.height);
    });
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
  }

  onSelectedNodesMoved() {
    const selectedVNodes = core.selectManager.selectedNodes;
    if (selectedVNodes.size < 1) return;

    //// работа со списком

    let movedVNodeRect: DOMRect;
    let movedNodes = new Set(selectedVNodes.values());

    const visited = new Set();
    const gather = (node: LNode) => {
      if (!node || visited.has(node)) return;
      visited.add(node);

      if (node.list?.children) {
        for (const child of node.list.children) {
          if (child.vNode) {
            movedNodes.add(child);
          }
          gather(child);
        }
      }
    };
    selectedVNodes.forEach((node) => {
      gather(node);
    });

    movedVNodeRect = this.getRectForNodes(movedNodes);
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
      .filter((node) => !movedNodes.has(node));

    candidates.sort((a, b) => a.y - b.y);

    let byNode = candidates?.[0];

    const selectedNodes: LNode[] = [];
    // оставим только родителей
    const refFunc = (node: LNode) => {
      const parentNode = node.list?.parentNode;

      // если нода имеет родителя среди выбранны, но не берём её
      if (parentNode && selectedVNodes.has(parentNode)) return;

      selectedNodes.push(node);
    };
    selectedVNodes.forEach((node: LNode) => refFunc(node));

    selectedNodes.sort((a, b) => b.y - a.y); // в обратном порядке

    const wasRef = new Set<LNode>();
    if (byNode) {
      // установим его новым родителем
      const willRefParent: LNode[] = [];
      selectedNodes.forEach((node) => {
        if (overRect.y < byNode.y) {
          const parentNode = byNode.list?.parentNode;
          if (parentNode) {
            const index = byNode.list?.index || 0;
            willRefParent.push(
              ...node.setNewListParent(parentNode, index - 0.6),
            );
          }
        } else {
          willRefParent.push(...node.setNewListParent(byNode, 0));
        }
      });

      willRefParent.forEach((node) => {
        const mainParent = node.getMainListParent();
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);
        mainParent.setPositionForAllLinkedChildNodes();
        mainParent.checkListTree();

        mainParent.vNode?.renderSVG();

        mainParent.save();
      });
    } else {
      const willRefParent: LNode[] = [];
      selectedNodes.forEach((node) => {
        willRefParent.push(...node.clearListParent());
      });
      willRefParent.forEach((node) => {
        const mainParent = node.getMainListParent();
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);
        mainParent.setPositionForAllLinkedChildNodes();
        mainParent.checkListTree();

        mainParent.vNode?.renderSVG();

        mainParent.save();
      });
    }
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    this.nodes.clear();

    for (const nodeData of snapshot.nodes) {
      const { _id } = nodeData;
      if (!_id) continue;
      const node = this.addNode(nodeData.type || 0);
      if (!node) continue;
      node.fromDB(nodeData);
      this.nodes.set(_id, node);
    }

    if (snapshot.pageNode) {
      this.pageNode = new LNode();
      this.pageNode.fromDB(snapshot.pageNode);
    }

    this.initAllLinks();

    core.store.emit(EVENTS.NodeManager.reInitAlnodes, undefined);
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
          node.list.parentNode = parentNode;
        }
      }
    }
  }
  setPositionForAllLinkedChildNodes() {
    for (const node of this.nodes.values()) {
      if (!node.list) continue;
      if (node.list.parentNode) continue;
      if (!node.list.children || node.list.children.size < 1) continue;
      node.setPositionForAllLinkedChildNodes();
    }
  }

  async copyNode(node: LNode, options?: Partial<LNode>): Promise<LNode | null> {
    const newNode = new LNode();

    // то что нужно склонировать из родителя
    newNode.exData = structuredClone(node.exData);

    for (const [key, value] of Object.entries(options || {})) {
      (newNode as any)[key] = value;
    }

    // newNode.x = Tools.getDiskPosition(options?.x ?? node.x + 20);
    // newNode.y = options?.y ?? node.y;
    // newNode.title = options?.title ?? node.title;

    console.time("save node");
    const id = await core.serverPersistence.createNode(newNode);
    console.timeEnd("save node");

    if (!id) return null;
    newNode._id = id;
    this.nodes.set(id, newNode);

    core.store.emit(EVENTS.node.created, newNode);

    return newNode;
  }
  createNodeWithTypeAndPositionFromCursor(type: number) {
    const { x, y } = core.desk.viewport.screenToWorld(
      core.desk.pointer.x,
      core.desk.pointer.y,
    );
    const newNode = this.createNode({
      x: Tools.getDiskPosition(x),
      y: Math.round(y),
      type,
    });
    if (newNode) {
      const vnode = newNode.vNode;
      vnode?.select();
      if (vnode instanceof VTextEdit) {
        (newNode as LNode_TextEdit).turnOn_EditTitleMode();
      }
      // core.selectManager.selectNodeById(newNode._id || "");
    }
  }
  addNode(type: number): LNode | null {
    const NodeClass = NODE_REGISTRY[type];
    if (!NodeClass) return null;
    const node: LNode = new NodeClass() as LNode;
    node.type = type;
    return node;
  }
  createNode({
    x = 0,
    y = 0,
    type = 0,
    exData = null,
  }: {
    x?: number;
    y?: number;
    type?: number;
    exData?: Record<string, any> | null;
  }) {
    const node = this.addNode(type);
    if (!node) return;
    node.x = Tools.getDiskPosition(x);
    node.y = Math.round(y);

    if (exData) node.exData = exData;

    core.serverPersistence.createNode(node, (id: string) => {
      node._id = id;
      this.nodes.set(id, node);
    });
    core.store.emit(EVENTS.node.created, node);
    return node;
  }

  getNode(_id: string) {
    return this.nodes.get(_id);
  }

  getAlnodes(): LNode[] {
    return Array.from(this.nodes.values());
  }
  // moveNodeTo(node: LNode, x: number, y: number): void {
  //   if (node.x === x && node.y === y) return;
  //   node.x = x;
  //   node.y = y;
  //   this.saveNode(node);
  // }

  // okNode(id: string): void {
  //   if (!this.nodes.has(id)) return;

  //   const node = this.nodes.get(id)!;
  //   node.ok = true;

  //   if (node.exData?.repeatMode) {
  //     const nextDate = Tools.getNextWeekday(
  //       parseInt(node.exData.repeatMode),
  //     );
  //     nextDate.setHours(0, 0, 0, 0);
  //     node.exData.repeatDay = nextDate;
  //   }
  //   this.saveNode(node);
  //   core.store.emit(EVENTS.node.deleted, node);
  //   this.nodes.delete(id);
  // }
  putNodeInTrash(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    node.inTrash = true;
    if (node.exData?.repeatMode) {
      const nextDate = Tools.getNextWeekday(parseInt(node.exData.repeatMode));
      nextDate.setHours(0, 0, 0, 0);
      node.exData.repeatDay = nextDate;
    }
    node.save();
    core.store.emit(EVENTS.node.inTrash, node);
    this.nodes.delete(id);
  }
  async create_TextEditCloneNode(mainNode: LNode, x?: number, y?: number) {
    if (!mainNode.type) return;

    if (!(mainNode instanceof LNode_TextEdit)) return;

    const cloneNode = this.addNode(
      NODE_TYPES.TEXT_EDIT_CLONE.id,
    ) as LNode_TEClone;
    if (!cloneNode) return;
    cloneNode.x = Tools.getDiskPosition(x ?? mainNode.x);
    cloneNode.y = y ?? mainNode.y;

    if (!mainNode.lID) {
      mainNode.lID = this.getMaxLID() + 1;
      mainNode.save();
    }

    cloneNode.mainNode = mainNode;

    switch (mainNode.type) {
      case NODE_TYPES.TEXT_EDIT.id:
        cloneNode.sourceNode = mainNode;
        break;
      case NODE_TYPES.TEXT_EDIT_CLONE.id:
        if (mainNode instanceof LNode_TEClone) {
          cloneNode.sourceNode = mainNode.sourceNode;
        }
        break;
    }

    if (mainNode instanceof LNode_TextEdit) {
      if (!mainNode.cloneNodes) mainNode.cloneNodes = new Set();
      mainNode.cloneNodes.add(cloneNode);
    }

    cloneNode.save();

    core.nodeRenderer.createVNode(cloneNode);

    /*


    if (node instanceof )
    if (
       ||
      node.type == NODE_TYPES.TEXT_EDIT_CLONE.id
    ) {
      // ищим главную ноду от которой идут все клоны
      let mainNodeEss = node;
      while (mainNodeEss.exData?.ownerNodesIds?.length) {
        mainNodeEss = this.getNode(mainNodeEss.exData.ownerNodesIds[0]!)!;
      }
      //
      vNode = core.nodeRenderer.getVNode(node._id || "") as VTextEdit;
      if (!vNode) return;
      cloneNodeEss = {
        ...cloneNodeEss,
        x: x ?? vNode.node.x, //+ vNode.width + 20,
        y: y ?? vNode.node.y,
        exData: {
          ownerNodesIds: [mainNodeEss._id!],
        },
      };
      if (
        node.type == NODE_TYPES.TEXT_EDIT_CLONE.id &&
        cloneNodeEss.exData &&
        node.exData?.ownerNodesIds &&
        node.exData.ownerNodesIds.length > 0
      ) {
        cloneNodeEss.exData.ownerNodesIds = [node.exData.ownerNodesIds[0]!];
      }
    } else return;

    const cloneNode = await this.createNode(cloneNodeEss);
    if (!cloneNode) return null;*/
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
    const node = vNode.node;
    const title = node.title || "";

    // пустая нода — просто сдвигаем вниз
    if (!title) {
      vNode.moveAniTo(null, (node.y ?? 0) + 25);
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
    if (node.lID) {
      parentLID = node.lID;
    } else {
      parentLID = this.getMaxLID() + 1;
      node.lID = parentLID;
    }

    node.save();

    vNode.turnOff_EditTitleMode();
    core.selectManager.clearSelection();

    // создаём новую ноду с правым текстом
    const newNode = await this.copyNode(node, {
      x: node.x,
      y: node.y + vNode.height,
      title: rightText,
      lID: undefined,
    });
    if (newNode) {
      newNode.setNewListParent(node, 0);
    }

    const newVnode = core.selectManager.selectNodeById(
      newNode?._id || "",
    ) as VTextEdit;
    newVnode?.onStop();
    if (newVnode) {
      newVnode.turnOn_EditTitleMode();
    }
  }
}
