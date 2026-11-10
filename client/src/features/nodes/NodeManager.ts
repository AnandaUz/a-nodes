import { LNode } from "@/features/nodes/LNode/LNode";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot, Command } from "../core/interfaces";
import Tools from "../core/Tools";
import { getNodeDescriptor, NODE_REGISTRY, NODE_TYPES } from "./node-registry";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import type { LNode_Page } from "./LNode/LNode_Page";
import { getRectForNodes, findNodeByLID } from "./nodeTreeUtils";
import {
  handleSelectedNodesMoved,
  initCloneLinks,
  setPositionForAllLinkedChildNodes,
} from "./nodeHierarchy";
import { diffDeskSnapshot, loadDeskSnapshot } from "./nodeSerialization";
import { cloneExDataForCopy, type IExData } from "@shared/types/IExData";
import {
  addTextEditNodeByEnter,
  addTextEditNodeUnderSelected,
} from "./nodeTextCreation";
import { SpatialIndex } from "./spatial/SpatialIndex";
import {
  putNodeInTrash,
  restoreNodeFromTrash,
  createDeleteCommand,
  removeAllClones,
  hardDeleteNode,
} from "./nodeTrashManager";
import { syncCurrentPageOutData } from "./nodeOutSync";
import { calculateMaxLID, reassignNodeLID } from "./nodeLIDManager";

export class NodeManager {
  nodes = new Set<LNode>();
  nodesByLID = new Map<number, LNode>();
  nodesById = new Map<string, LNode>();
  private maxLID = 1;
  pendingUpdatedNodes = new Set<LNode>();
  private isFlushScheduled = false;
  spatialIndex = new SpatialIndex<LNode>();
  pageNode: LNode_Page | undefined;
  private unsubscribers: (() => void)[] = [];

  registerNode(node: LNode): void {
    this.nodes.add(node);
    if (node.lID) {
      this.nodesByLID.set(node.lID, node);
      if (node.lID > this.maxLID) {
        this.maxLID = node.lID;
      }
    }
    if (node._id) {
      this.nodesById.set(node._id, node);
    }
  }

  unregisterNode(node: LNode): void {
    this.nodes.delete(node);
    this.pendingUpdatedNodes.delete(node);
    if (node.lID && this.nodesByLID.get(node.lID) === node) {
      this.nodesByLID.delete(node.lID);
    }
    if (node._id && this.nodesById.get(node._id) === node) {
      this.nodesById.delete(node._id);
    }
  }

  scheduleNodeUpdate(node: LNode): void {
    this.pendingUpdatedNodes.add(node);
    this.scheduleFlushUpdates();
  }

  private scheduleFlushUpdates(): void {
    if (this.isFlushScheduled) return;
    this.isFlushScheduled = true;
    queueMicrotask(() => {
      this.flushPendingUpdates();
    });
  }

  flushPendingUpdates(): void {
    this.isFlushScheduled = false;
    if (this.pendingUpdatedNodes.size === 0) return;
    const batch = Array.from(this.pendingUpdatedNodes);
    this.pendingUpdatedNodes.clear();
    for (const node of batch) {
      if (this.nodes.has(node)) {
        this.spatialIndex.update(node);
      }
    }
  }

  clear(): void {
    this.nodes.forEach((node) => {
      node.frame?.parents?.forEach((p: any) => p.path?.remove?.());
      node.vNode?.remove();
    });
    this.nodes.clear();
    this.nodesByLID.clear();
    this.nodesById.clear();
    this.maxLID = 1;
    this.pendingUpdatedNodes.clear();
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
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    this.unsubscribers.push(
      core.store.on(EVENTS.node.selectedMoved, () => {
        this.onSelectedNodesMoved();
      }),
      core.store.on(EVENTS.node.updated, (node) => {
        if (!node) return;
        this.scheduleNodeUpdate(node);
        if (node.isLockedInOutFrame && !node.isOutGroupHeader) {
          const mainPage = node.list.mainParent as LNode_Page | null;
          if (
            mainPage &&
            mainPage.type === NODE_TYPES.PAGE.id &&
            Array.isArray(mainPage.out)
          ) {
            let changed = false;
            for (const grp of mainPage.out) {
              if (node.outFrameLID && grp.lID !== node.outFrameLID) continue;
              for (const it of grp.items || []) {
                if (
                  (node._id && it._id === node._id) ||
                  (!node._id && it.lID === node.lID)
                ) {
                  if (it.t !== (node.title || "")) {
                    it.t = node.title || "";
                    changed = true;
                  }
                }
              }
            }
            if (changed) {
              mainPage.save();
            }
          }
        } else if (this.pageNode && node !== this.pageNode) {
          this.syncCurrentPageOutData();
        }
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
    this.syncCurrentPageOutData();
  }

  syncCurrentPageOutData(): void {
    syncCurrentPageOutData(this);
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    loadDeskSnapshot(this, snapshot);
    this.rebuildSpatialIndex();
  }

  applyDeltaSnapshot(snapshot: DeskSnapshot, dirtyNodes?: Set<LNode>): void {
    diffDeskSnapshot(this, snapshot, { isDelta: true, dirtyNodes });
    this.rebuildSpatialIndex();
  }

  getNodeByLID(lID: number): LNode | undefined {
    if (!lID) return undefined;
    const cached = this.nodesByLID.get(lID);
    if (cached && cached.lID === lID && this.nodes.has(cached)) {
      return cached;
    }
    const found = findNodeByLID(this.nodes, lID);
    if (found) {
      this.nodesByLID.set(lID, found);
      if (found.lID && found.lID > this.maxLID) {
        this.maxLID = found.lID;
      }
    }
    return found;
  }

  getNodeById(id: string): LNode | undefined {
    if (!id) return undefined;
    const cached = this.nodesById.get(id);
    if (cached && cached._id === id && this.nodes.has(cached)) {
      return cached;
    }
    for (const node of this.nodes) {
      if (node._id === id) {
        this.nodesById.set(id, node);
        return node;
      }
    }
    return undefined;
  }

  initCloneLinks() {
    initCloneLinks(
      this.nodes,
      (id) => this.getNodeByLID(id),
      (id) => this.getNodeById(id),
    );
  }

  setPositionForAllLinkedChildNodes() {
    setPositionForAllLinkedChildNodes(this.nodes);
  }

  copyNode(node: LNode, options?: Partial<LNode>) {
    const newNode = this.createNode({
      type: options?.type || node.type,
      x: options?.x ?? node.x,
      y: options?.y ?? node.y,
    });

    if (!newNode) return null;

    newNode.title = node.title;
    // то что нужно склонировать из родителя
    if (node.exData) {
      newNode.exData = cloneExDataForCopy(node.exData);
    }

    if (node.type === NODE_TYPES.TEXT_EDIT_CLONE.id) {
      const cloneNode = newNode as LNode_TEClone;
      const originalClone = node as LNode_TEClone;
      const main = originalClone.clones.mainNode;
      if (main) {
        cloneNode.clones.mainNode = main;
        main.clones.nodes.add(cloneNode);
        cloneNode.clones.sourceNode = originalClone.clones.sourceNode || main;
      }
    }

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
      newNode.turnOn_EditTitleMode?.();
    }
    this.onSelectedNodesMoved();
    return newNode;
  }
  addNode(type: number): LNode {
    const descriptor = getNodeDescriptor(type);
    const NodeClass = descriptor?.LNodeClass || NODE_REGISTRY[type] || LNode;
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
    exData?: IExData | null;
  }) {
    const node = this.addNode(type);
    node.x = Tools.getDiskPosition(x);
    node.y = Math.round(y);

    if (exData) node.exData = exData;

    if (!node._id) {
      node._id = Tools.generateObjectId();
    }
    this.registerNode(node);
    this.spatialIndex.insert(node);

    if (core.serverPersistence) {
      core.serverPersistence.createNode(node, (id: string) => {
        if (id && id !== node._id) {
          this.unregisterNode(node);
          node._id = id;
          this.registerNode(node);
        }
      });
    }
    core.store.emit(EVENTS.node.created, node);
    return node;
  }
  getAllNodes(): LNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * @contract
   *   Предусловия: узел node зарегистрирован в менеджере.
   *   Постусловия: помечает узел удаленным (inTrash=true) или переводит в скрытый повтор.
   */
  putNodeInTrash(node: LNode, withClones: boolean = false): void {
    putNodeInTrash(this, node, withClones);
  }

  /**
   * @contract
   *   Предусловия: узел node находится в корзине.
   *   Постусловия: снимает флаг inTrash, возвращает в SpatialIndex и восстанавливает связи.
   */
  restoreNodeFromTrash(node: LNode, withClones: boolean = false): void {
    restoreNodeFromTrash(this, node, withClones);
  }

  createDeleteCommand(node: LNode, withClones: boolean = false): Command {
    return createDeleteCommand(this, node, withClones);
  }

  removeAllClones(node: LNode): void {
    removeAllClones(this, node);
  }

  hardDeleteNode(node: LNode): void {
    hardDeleteNode(this, node);
  }

  create_TextEditCloneNode(
    mainNode: LNode_TextEdit | LNode_TEClone,
    x?: number,
    y?: number,
  ) {
    const cloneNode = this.createNode({
      x: x || 0,
      y: y ?? 0,
      type: NODE_TYPES.TEXT_EDIT_CLONE.id,
    }) as LNode_TEClone;

    this.ensureLID(mainNode);

    cloneNode.clones.mainNode = mainNode;
    mainNode.clones.nodes.add(cloneNode);
    if (mainNode.type === NODE_TYPES.TEXT_EDIT_CLONE.id) {
      cloneNode.clones.sourceNode = (
        mainNode as LNode_TEClone
      ).clones.sourceNode;
    } else {
      cloneNode.clones.sourceNode = mainNode;
    }
    const resolvedSource = cloneNode.clones.sourceNode || mainNode;
    if (resolvedSource._id) {
      cloneNode.clones.sourceNodeId = resolvedSource._id;
    }
    cloneNode.title = resolvedSource.title;

    core.nodeRenderer.createVNode(cloneNode);

    cloneNode.save();
    return cloneNode;
  }
  getMaxLID(): number {
    this.maxLID = calculateMaxLID(this.nodes, this.maxLID);
    return this.maxLID;
  }

  generateLID(): number {
    this.getMaxLID();
    return ++this.maxLID;
  }

  ensureLID(node: LNode): number {
    if (!node.lID) {
      node.lID = this.generateLID();
      this.nodesByLID.set(node.lID, node);
      node.save();
    } else {
      if (node.lID > this.maxLID) {
        this.maxLID = node.lID;
      }
      this.nodesByLID.set(node.lID, node);
    }
    return node.lID;
  }

  /**
   * @contract
   *   Предусловия: node существует в менеджере.
   *   Постусловия: каскадно переназначает lID узла, обновляет ссылки в дочерних узлах, фреймах и клонах.
   */
  reassignNodeLID(node: LNode, newLID: number): void {
    reassignNodeLID(this.nodes, this.nodesByLID, node, newLID, () => this.getMaxLID());
  }

  async addTextEditNode_byEnter(e: KeyboardEvent) {
    return addTextEditNodeByEnter(this, e);
  }

  addTextEditNode_underSelected(
    selectedNode: LNode_TextEdit,
  ): LNode_TextEdit | null {
    return addTextEditNodeUnderSelected(this, selectedNode);
  }

  rebuildSpatialIndex(): void {
    this.spatialIndex.load(this.nodes);
  }

  ensureSpatialIndexSynced(): void {
    if (this.pendingUpdatedNodes.size > 0) {
      this.flushPendingUpdates();
    }
    if (this.spatialIndex.size !== this.nodes.size) {
      this.rebuildSpatialIndex();
    }
  }

  searchInRect(
    rect: { x: number; y: number; width: number; height: number } | DOMRect,
    includeHidden = false,
  ): LNode[] {
    this.ensureSpatialIndexSynced();
    const result = this.spatialIndex.searchRect(rect);
    return includeHidden ? result : result.filter((n) => !n.hidden && !n.inTrash);
  }

  searchAtPoint(x: number, y: number, includeHidden = false): LNode[] {
    this.ensureSpatialIndexSynced();
    const result = this.spatialIndex.searchPoint(x, y);
    return includeHidden ? result : result.filter((n) => !n.hidden && !n.inTrash);
  }

  getNodeAtPoint(x: number, y: number): LNode | undefined {
    const candidates = this.searchAtPoint(x, y);
    return candidates.find((node) => node.vNode?.checkPointOver(x, y));
  }
}
