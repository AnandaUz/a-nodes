import { LNode } from "@/features/nodes/LNode/LNode";
import { core, EVENTS } from "../core/core";
import { GRID } from "../core/CONST";
import type { DeskSnapshot, Command } from "../core/interfaces";
import Tools from "../core/Tools";
import type VTextEdit from "@features/nodes/VNode/VTextEdit";
import { NODE_REGISTRY, NODE_TYPES } from "./node-registry";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import type { LNode_Page } from "./LNode/LNode_Page";
import {
  getRectForNodes,
  findNodeByLID,
  getMaxLID,
  generateLID,
  ensureLID,
} from "./nodeTreeUtils";
import {
  handleSelectedNodesMoved,
  initCloneLinks,
  setPositionForAllLinkedChildNodes,
} from "./nodeHierarchy";
import { loadDeskSnapshot } from "./nodeSerialization";
import { SpatialIndex } from "./spatial/SpatialIndex";

export class NodeManager {
  nodes = new Set<LNode>();
  spatialIndex = new SpatialIndex<LNode>();
  pageNode: LNode_Page | undefined;
  private unsubscribers: (() => void)[] = [];

  clear(): void {
    this.nodes.forEach((node) => {
      (node as any).frame?.parents?.forEach((p: any) => p.path?.remove?.());
      node.vNode?.remove();
    });
    this.nodes.clear();
    this.spatialIndex.clear();
    if (this.pageNode) {
      this.pageNode.vNode?.remove();
      this.pageNode = undefined;
    }
  }

  unmount() {
    this.unsubscribers.forEach((fn) => fn());
    this.clear();
  }

  init() {
    this.unsubscribers.push(
      core.store.on(EVENTS.node.selectedMoved, () => {
        this.onSelectedNodesMoved();
      }),
      core.store.on(EVENTS.node.updated, (node) => {
        if (node) this.spatialIndex.update(node);
      }),
      core.store.on(EVENTS.NodeManager.reInitAlnodes, () => {
        this.rebuildSpatialIndex();
      }),
    );
  }
  getRectForNodes(nodes: Set<LNode>) {
    return getRectForNodes(nodes);
  }

  onSelectedNodesMoved() {
    handleSelectedNodesMoved(this);
    core.selectManager?.selectedNodes.forEach((node) => {
      this.spatialIndex.update(node);
    });
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    loadDeskSnapshot(this, snapshot);
    this.rebuildSpatialIndex();
  }

  getNodeByLID(lID: number) {
    return findNodeByLID(this.nodes, lID);
  }

  initCloneLinks() {
    initCloneLinks(this.nodes, (id) => this.getNodeByLID(id));
  }

  setPositionForAllLinkedChildNodes() {
    setPositionForAllLinkedChildNodes(this.nodes);
  }

  copyNode(node: LNode, options?: Partial<LNode>) {
    const newNode = this.createNode({
      type: options?.type || node.type,
    });

    if (!newNode) return null;

    // то что нужно склонировать из родителя
    newNode.exData = structuredClone(node.exData);

    for (const [key, value] of Object.entries(options || {})) {
      (newNode as any)[key] = value;
    }
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
      core.nodeRenderer.createVNode(newNode);
      newNode.select();
      core.selectManager.selectNode(newNode);
      if (newNode.type === NODE_TYPES.TEXT_EDIT.id) {
        (newNode as any).turnOn_EditTitleMode();
      }
    }
    this.onSelectedNodesMoved();
    return newNode;
  }
  addNode(type: number): LNode {
    const NodeClass = NODE_REGISTRY[type] || LNode;
    const node: LNode = new NodeClass();
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
    type: number;
    exData?: Record<string, any> | null;
  }) {
    const node = this.addNode(type);
    node.x = Tools.getDiskPosition(x);
    node.y = Math.round(y);

    if (exData) node.exData = exData;

    if (core.serverPersistence) {
      core.serverPersistence.createNode(node, (id: string) => {
        node._id = id;
        this.nodes.add(node);
        this.spatialIndex.insert(node);
      });
    } else {
      this.nodes.add(node);
      this.spatialIndex.insert(node);
    }
    core.store.emit(EVENTS.node.created, node);
    return node;
  }
  getAllNodes(): LNode[] {
    return Array.from(this.nodes.values());
  }

  putNodeInTrash(node: LNode, withClones: boolean = false): void {
    if (node.repeatMode.mode > 0 || node.repeatMode.date) {
      if (node.repeatMode.mode > 0) {
        const nextDate = Tools.getNextWeekday(node.repeatMode.mode);
        nextDate.setHours(0, 0, 0, 0);
        node.repeatMode.date = nextDate;
      }
      node.hide();
      node.save();
      node.remove();
    } else {
      node.inTrash = true;
      node.save();
      core.store.emit(EVENTS.node.inTrash, node);
      this.nodes.delete(node);
      this.spatialIndex.remove(node);
      node.remove();
    }

    if (withClones) {
      (node as LNode_TextEdit).clones.doForAll((cloneNode) => {
        this.putNodeInTrash(cloneNode, false);
      });
      return;
    }
    // отключаем паур кнопку
    if (node.type === NODE_TYPES.TEXT_EDIT.id && (node as any).clones?.mainNode) {
      if ((node as any).clones.mainNode.type === NODE_TYPES.TEXT_EDIT.id)
        (node as any).clones.mainNode.frame.turnOff_PowerBtn((node as any).frame?.frameLID);
    }
  }

  restoreNodeFromTrash(node: LNode, withClones: boolean = false): void {
    node.inTrash = false;
    this.nodes.add(node);
    this.spatialIndex.insert(node);

    if (node.hiddenBD) {
      node.hiddenBD = false;
    }
    node.hidden = false;

    if (!node.vNode && core.nodeRenderer) {
      core.nodeRenderer.createVNode(node);
    } else {
      node.vNode?.show();
    }

    if (node.list?.parentLID) {
      const parentNode = this.getNodeByLID(node.list.parentLID);
      if (parentNode && !parentNode.inTrash) {
        if (!parentNode.list.children) parentNode.list.children = new Set();
        parentNode.list.children.add(node);
        node.list.parentNode = parentNode;
        (parentNode.vNode as any)?.refreshListBtns?.();
      }
    }

    const mainParent =
      node.list?.mainParent ||
      (node.list?.parentNode ? node.list.parentNode.list?.mainParent : null);
    if (mainParent) {
      mainParent.list.setPositionForChildren();
      mainParent.vNode?.renderSVG();
    } else {
      node.list?.setPositionForChildren();
      node.vNode?.renderSVG();
    }

    node.save();
    core.store.emit(EVENTS.node.created, node);

    if (withClones) {
      (node as LNode_TextEdit).clones?.doForAll((cloneNode) => {
        this.restoreNodeFromTrash(cloneNode, false);
      });
      return;
    }

    if (
      node.type === NODE_TYPES.TEXT_EDIT.id &&
      (node as any).clones?.mainNode
    ) {
      if ((node as any).clones.mainNode.type === NODE_TYPES.TEXT_EDIT.id) {
        (node as any).clones.mainNode.frame?.setBtnsState();
      }
    }
  }

  createDeleteCommand(node: LNode, withClones: boolean = false): Command {
    const parentNode = node.list?.parentNode;
    const parentLID = node.list?.parentLID;
    const index = node.list?.index ?? 0;
    const tab = node.list?.tab ?? 0;
    const children = node.list?.children ? Array.from(node.list.children) : [];
    const posX = node.x;
    const posY = node.y;

    return {
      execute: () => {
        this.putNodeInTrash(node, withClones);
      },
      undo: () => {
        this.restoreNodeFromTrash(node, withClones);
        node.x = posX;
        node.y = posY;
        if (parentNode && !parentNode.inTrash) {
          node.list.setParent(parentNode, index);
          node.list.tab = tab;
        } else if (parentLID) {
          const p = this.getNodeByLID(parentLID);
          if (p && !p.inTrash) {
            node.list.setParent(p, index);
            node.list.tab = tab;
          }
        }
        children.forEach((child) => {
          if (!child.inTrash) {
            child.list.setParent(node, child.list.index ?? 0);
          }
        });
        const root = node.list?.mainParent || node;
        root.list?.setPositionForChildren();
        root.vNode?.renderSVG();
        node.save();
      },
    };
  }

  removeAllClones(node: LNode): void {
    if (node.clones) {
      node.clones.nodes.forEach((clone) => {
        this.putNodeInTrash(clone);
      });
      node.clones.removeAllClones();
    }
  }

  hardDeleteNode(node: LNode): void {
    const parent = node.list?.parentNode;
    const mainParent = node.list?.mainParent;

    if (node.list) {
      node.list.clearParent();
    }

    core.serverPersistence.deleteNode(node);
    core.selectManager.unselectNode(node);
    this.nodes.delete(node);
    this.spatialIndex.remove(node);
    node.remove();

    if (mainParent) {
      mainParent.list?.setPositionForChildren();
    } else if (parent) {
      parent.list?.setPositionForChildren();
    }
  }

  create_TextEditCloneNode(mainNode: LNode_TextEdit, x?: number, y?: number) {
    const cloneNode = this.createNode({
      x: x || 0,
      y: y ?? 0,
      type: NODE_TYPES.TEXT_EDIT_CLONE.id,
    }) as LNode_TEClone;

    this.ensureLID(mainNode);

    cloneNode.clones.mainNode = mainNode;
    mainNode.clones.nodes.add(cloneNode);
    if (mainNode.type === NODE_TYPES.TEXT_EDIT_CLONE.id) {
      cloneNode.clones.sourceNode = (mainNode as LNode_TEClone).clones.sourceNode;
    } else {
      cloneNode.clones.sourceNode = mainNode;
    }

    core.nodeRenderer.createVNode(cloneNode);

    cloneNode.save();
    return cloneNode;
  }
  getMaxLID() {
    return getMaxLID(this.nodes);
  }

  generateLID(): number {
    return generateLID(this.nodes);
  }

  ensureLID(node: LNode): number {
    return ensureLID(this.nodes, node);
  }

  async addTextEditNode_byEnter(e: KeyboardEvent) {
    Tools.stopEvent(e);

    if (core.mode.selectedVNodeCount !== 1) return;
    if (!core.mode.textEditing) return;

    const node = core.selectManager.selectedNodes.values().next()
      .value as LNode_TextEdit;
    const title = node.title || "";
    const vNode = node.vNode as VTextEdit;

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
    this.ensureLID(node);

    node.turnOff_EditTitleMode();
    core.selectManager.clearSelection();

    const options = {
      x: node.x,
      y: node.y + vNode.height,
      title: rightText,
    } as Partial<LNode>;
    if (node.type === NODE_TYPES.TEXT_EDIT_CLONE.id) {
      options.type = NODE_TYPES.TEXT_EDIT.id;
    }
    // создаём новую ноду с правым текстом
    const newNode = this.copyNode(node, options) as LNode_TextEdit;
    if (newNode) {
      core.nodeRenderer.createVNode(newNode);

      newNode.list.setParent(node, 0);

      const mainNode = node.list.mainParent as LNode_TextEdit;
      if (mainNode?.frame?.isFrame) {
        newNode.vNode?.body.classList.add("in-frame");
        newNode.frame.addPowerBtns();
        mainNode.list.setPositionForChildren();
        mainNode.vNode?.renderSVG();
        mainNode.frame.bringToFront();
      } else if (mainNode) {
        mainNode.list.setPositionForChildren();
        mainNode.vNode?.renderSVG();
      }
      (node.vNode as any)?.refreshListBtns?.();

      core.selectManager.selectNode(newNode);
      // newVnode?.onStop();
      (newNode as any).isCreatedByEnter = true;
      (newNode as any).turnOn_EditTitleMode?.();

      if (core.history) {
        core.history.push({
          execute: () => {
            node.title = leftText;
            vNode.title = leftText;
            vNode.refreshBodyRect();
            vNode.render();
            node.save();
            this.restoreNodeFromTrash(newNode);
          },
          undo: () => {
            node.title = title;
            vNode.title = title;
            vNode.refreshBodyRect();
            vNode.render();
            node.save();
            this.putNodeInTrash(newNode);
          },
        });
      }
    }
  }

  addTextEditNode_underSelected(
    selectedNode: LNode_TextEdit,
  ): LNode_TextEdit | null {
    let parent: LNode;
    let targetIndex: number;

    if (selectedNode.list?.parentNode) {
      parent = selectedNode.list.parentNode;
      targetIndex = (selectedNode.list.index ?? 0) + 1.1;
    } else {
      parent = selectedNode;
      targetIndex = (selectedNode.list?.children?.size ?? 0) + 0.6;
    }

    const newX = selectedNode.list?.parentNode
      ? selectedNode.x
      : selectedNode.x + GRID.x;
    const newY =
      (selectedNode.y ?? 0) + ((selectedNode.vNode as any)?.height || 25);

    this.ensureLID(parent);

    const newNode = this.createNode({
      x: newX,
      y: newY,
      type: NODE_TYPES.TEXT_EDIT.id,
    }) as LNode_TextEdit;

    if (newNode) {
      if (core.nodeRenderer) {
        core.nodeRenderer.createVNode(newNode);
      }

      newNode.list.setParent(parent, targetIndex);
      newNode.save();

      const mainNode = (selectedNode.list?.mainParent ||
        parent.list?.mainParent ||
        parent) as LNode_TextEdit;
      if (mainNode?.frame?.isFrame) {
        newNode.vNode?.body?.classList.add("in-frame");
        newNode.frame?.addPowerBtns();
        mainNode.list.setPositionForChildren();
        mainNode.vNode?.renderSVG();
        mainNode.frame?.bringToFront();
      } else if (mainNode) {
        mainNode.list.setPositionForChildren();
        mainNode.vNode?.renderSVG();
      }

      (selectedNode.vNode as any)?.refreshListBtns?.();
      (parent.vNode as any)?.refreshListBtns?.();

      core.selectManager.clearSelection();
      core.selectManager.selectNode(newNode);
      newNode.turnOn_EditTitleMode?.();
      return newNode;
    }

    return null;
  }

  rebuildSpatialIndex(): void {
    this.spatialIndex.load(this.nodes);
  }

  ensureSpatialIndexSynced(): void {
    if (this.spatialIndex.size !== this.nodes.size) {
      this.rebuildSpatialIndex();
    }
  }

  searchInRect(
    rect: { x: number; y: number; width: number; height: number } | DOMRect,
  ): LNode[] {
    this.ensureSpatialIndexSynced();
    return this.spatialIndex.searchRect(rect);
  }

  searchAtPoint(x: number, y: number): LNode[] {
    this.ensureSpatialIndexSynced();
    return this.spatialIndex.searchPoint(x, y);
  }

  getNodeAtPoint(x: number, y: number): LNode | undefined {
    const candidates = this.searchAtPoint(x, y);
    return candidates.find((node) => node.vNode?.checkPointOver(x, y));
  }
}
