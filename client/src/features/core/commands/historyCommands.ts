import { core } from "../core";
import type { Command } from "../interfaces";
import { fromDB, toDB, type INodeDB } from "@shared/types/INodeDB";
import type { LNode } from "@/features/nodes/LNode/LNode";
import type { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import type VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { applyTreeVisibility } from "@/features/nodes/nodeTreeUtils";

function getNodeKey(node: LNode | string): string {
  if (typeof node === "string") return node;
  if (node._id) return node._id;
  if (node.lID) return `lid:${node.lID}`;
  return "";
}

function resolveLiveNode(key: string, db?: INodeDB): LNode | undefined {
  const manager = core.nodeManager;
  if (!manager) return undefined;
  const id = db?._id || (!key.startsWith("lid:") ? key : undefined);
  if (id) {
    const byId = manager.getNodeById(id);
    if (byId) return byId;
  }
  if (key.startsWith("lid:")) {
    const lid = Number(key.slice(4));
    if (lid > 0) return manager.getNodeByLID(lid);
  }
  const dbLid = db?.s !== undefined ? db.s & ((1 << 17) - 1) : 0;
  if (dbLid > 0) {
    return manager.getNodeByLID(dbLid);
  }
  return undefined;
}

function areExDataEqual(
  exA: INodeDB["exData"],
  exB: INodeDB["exData"],
): boolean {
  if (exA === exB) return true;
  if (!exA && !exB) return true;
  if (!exA || !exB) return false;
  if (
    exA.bgColor !== exB.bgColor ||
    exA.tColor !== exB.tColor ||
    exA.repeatMode !== exB.repeatMode ||
    exA.url !== exB.url ||
    exA.h !== exB.h ||
    exA.hh !== exB.hh
  ) {
    return false;
  }
  const dayA = exA.repeatDay ? new Date(exA.repeatDay).getTime() : 0;
  const dayB = exB.repeatDay ? new Date(exB.repeatDay).getTime() : 0;
  if (dayA !== dayB) return false;

  const ownersA = exA.ownerNodesIds || [];
  const ownersB = exB.ownerNodesIds || [];
  if (ownersA.length !== ownersB.length) return false;
  for (let i = 0; i < ownersA.length; i++) {
    if (ownersA[i] !== ownersB[i]) return false;
  }
  return true;
}

function areFrameArraysEqual(
  a: number[] | null | undefined,
  b: number[] | null | undefined,
): boolean {
  const arrA = a || [];
  const arrB = b || [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }
  return true;
}

export function areHistoryStatesEqual(a: INodeDB, b: INodeDB): boolean {
  if (a.type !== b.type) return false;
  if (a.title !== b.title) return false;
  if (Boolean(a.inTrash) !== Boolean(b.inTrash)) return false;
  if ((a.L ?? 0) !== (b.L ?? 0)) return false;
  if (a.L === undefined && b.L === undefined) {
    if ((a.x ?? 0) !== (b.x ?? 0) || (a.y ?? 0) !== (b.y ?? 0)) return false;
  }
  // В `s` младшие 17 бит — lID (может быть выдан через ensureLID без изменения состояния ноды),
  // старшие биты — флаги (isFrame, hiddenBD, isListOpen, isRepeatsOpen, isHiddenOpen).
  const flagsA = (a.s ?? 0) >> 17;
  const flagsB = (b.s ?? 0) >> 17;
  if (flagsA !== flagsB) return false;

  if ((a.A ?? 0) !== (b.A ?? 0)) return false;
  if ((a.c ?? "") !== (b.c ?? "")) return false;
  if ((a.D ?? 0) !== (b.D ?? 0)) return false;
  if (Boolean(a.i) !== Boolean(b.i)) return false;
  if (Boolean(a.o) !== Boolean(b.o)) return false;
  if (Boolean(a.isLockedInOutFrame) !== Boolean(b.isLockedInOutFrame)) {
    return false;
  }
  if ((a.outFrameLID ?? 0) !== (b.outFrameLID ?? 0)) return false;
  if (!areFrameArraysEqual(a.f, b.f)) return false;
  if (!areExDataEqual(a.exData, b.exData)) return false;

  return true;
}

function compactPair(
  before: INodeDB,
  after: INodeDB,
): { before: INodeDB; after: INodeDB } {
  const b: INodeDB = { ...before, lastUpdate: undefined };
  const a: INodeDB = { ...after, lastUpdate: undefined };
  if (areExDataEqual(b.exData, a.exData)) {
    a.exData = b.exData;
  }
  if (areFrameArraysEqual(b.f, a.f)) {
    a.f = b.f;
  }
  return { before: b, after: a };
}

export class SnapshotDiffCommand implements Command {
  private before = new Map<string, INodeDB>();
  private after = new Map<string, INodeDB>();

  constructor(
    before: ReadonlyMap<LNode | string, INodeDB>,
    after: ReadonlyMap<LNode | string, INodeDB>,
  ) {
    const rawBefore = new Map<string, INodeDB>();
    const rawAfter = new Map<string, INodeDB>();

    before.forEach((db, key) => {
      const k = getNodeKey(key);
      if (k) rawBefore.set(k, db);
    });
    after.forEach((db, key) => {
      const k = getNodeKey(key);
      if (k) rawAfter.set(k, db);
    });

    const allKeys = new Set<string>([...rawBefore.keys(), ...rawAfter.keys()]);
    for (const key of allKeys) {
      const b = rawBefore.get(key);
      const a = rawAfter.get(key);
      if (b && a) {
        if (areHistoryStatesEqual(b, a)) continue;
        const compacted = compactPair(b, a);
        this.before.set(key, compacted.before);
        this.after.set(key, compacted.after);
      } else if (b) {
        this.before.set(key, { ...b, lastUpdate: undefined });
      } else if (a) {
        this.after.set(key, { ...a, lastUpdate: undefined });
      }
    }
  }

  get hasChanges(): boolean {
    return this.before.size > 0 || this.after.size > 0;
  }

  get size(): number {
    return Math.max(this.before.size, this.after.size);
  }

  execute(): void {
    this.applySnapshot(this.after);
  }

  undo(): void {
    this.applySnapshot(this.before);
  }

  private applySnapshot(targetMap: Map<string, INodeDB>): void {
    const manager = core.nodeManager;
    if (!manager || targetMap.size === 0) return;

    const resolved = new Map<
      string,
      {
        node: LNode;
        db: INodeDB;
        prevIsFrame: boolean;
        prevX: number;
        prevY: number;
      }
    >();
    const affectedRoots = new Set<LNode>();
    const affectedParents = new Set<LNode>();

    // 1. Находим живые ноды и фиксируем старых родителей / корни до мутации
    for (const [key, db] of targetMap) {
      const node = resolveLiveNode(key, db);
      if (!node) continue;

      const oldParent = node.list.parentNode;
      const oldMain = node.list.mainParent;
      if (oldParent) affectedParents.add(oldParent);
      if (oldMain) affectedRoots.add(oldMain);

      const textNode = node as LNode_TextEdit;
      const prevIsFrame = Boolean(textNode.frame?.isFrame);

      resolved.set(key, {
        node,
        db,
        prevIsFrame,
        prevX: node.x,
        prevY: node.y,
      });
    }

    if (resolved.size === 0) return;

    // 2. Отсоединяем от старых родителей и применяем fromDB
    for (const { node, db, prevX, prevY } of resolved.values()) {
      const oldParent = node.list.parentNode;
      const oldMain = node.list.mainParent;

      const cloneMain = (node as LNode_TextEdit).clones?.mainNode;
      if (cloneMain && oldMain?.lID) {
        (cloneMain.vNode as VTextEdit | undefined)?.removePowerIndicators?.(
          oldMain.lID,
        );
      }

      if (oldParent) {
        oldParent.list.children?.delete(node);
        oldParent.list.invalidateChildrenOrder();
        oldParent.list.invalidateRectCache();
        node.list._parentNode = null;
      }

      const prevLID = node.lID;
      fromDB(db, node);
      if (prevLID && !node.lID) {
        node.lID = prevLID;
      }
      if (db.x === undefined && db.y === undefined && db.L !== undefined) {
        node.x = prevX;
        node.y = prevY;
      }
      manager.registerNode(node);
    }

    // 3. Восстанавливаем иерархию TList и связи TFrame
    for (const { node, prevIsFrame } of resolved.values()) {
      const targetParentLID = node.list.parentLID;
      if (targetParentLID && targetParentLID !== node.lID) {
        const newParent = manager.getNodeByLID(targetParentLID);
        if (newParent) {
          const unpackedIndex = node.list.index;
          node.list.initParent(newParent);
          if (unpackedIndex !== undefined) {
            node.list.index = unpackedIndex;
          }
          newParent.list.invalidateChildrenOrder();
          newParent.list.invalidateRectCache();
          affectedParents.add(newParent);
          if (newParent.list.mainParent) {
            affectedRoots.add(newParent.list.mainParent);
          }
        } else {
          node.list.parentNode = null;
        }
      } else {
        node.list.parentNode = null;
        node.list.totalIndex = -1;
        if (node.vNode?.body) {
          delete node.vNode.body.dataset.totaltab;
          node.vNode.body.classList.remove("in-frame");
        }
      }

      if (!node.list.parentNode) {
        affectedRoots.add(node);
      } else if (node.list.mainParent) {
        affectedRoots.add(node.list.mainParent);
      }

      const textNode = node as LNode_TextEdit;
      if (textNode.frame) {
        if (textNode.frame.isFrame !== prevIsFrame) {
          if (textNode.frame.isFrame) {
            textNode.frame.turnOn_frameMode();
          } else {
            textNode.frame.turnOff_frameMode();
          }
        }
        textNode.frame.updateIoClasses();
        this.syncFrameLinks(textNode);
      }
    }

    // 4. Пересчитываем геометрию и видимость всех затронутых корневых деревьев
    for (const { node } of resolved.values()) {
      node.vNode?.render();
      node.vNode?.refreshBodyRect();
      if (!node.list.parentNode) {
        node.vNode?.applyPosition();
      }
    }

    const currentRoots = new Set<LNode>();
    for (const candidate of affectedRoots) {
      if (!manager.nodes.has(candidate)) continue;
      const root = candidate.list.mainParent || candidate;
      if (!root.list.parentNode && manager.nodes.has(root)) {
        currentRoots.add(root);
      }
    }

    for (const root of currentRoots) {
      root.list.invalidateChildrenOrder();
      root.list.invalidateRectCache();
      applyTreeVisibility(root);
      root.vNode?.applyPosition();
      root.vNode?.refreshBodyRect();

      if (root.list.children?.size) {
        root.list.setPositionForChildren();
      }

      const frameRoot = root as LNode_TextEdit;
      if (frameRoot.frame?.isFrame) {
        frameRoot.frame.initBtns();
        frameRoot.frame.setBtnsState();
      }
    }

    // 5. Обновляем визуализацию, кнопки списков, индекс и сохраняем изменения
    for (const parent of affectedParents) {
      (parent.vNode as { refreshListBtns?: () => void } | undefined)?.refreshListBtns?.();
      parent.vNode?.renderSVG();
    }

    for (const { node } of resolved.values()) {
      node.vNode?.applyPosition();
      node.vNode?.refreshBodyRect();
      (node.vNode as { refreshListBtns?: () => void } | undefined)?.refreshListBtns?.();
      node.refresh();
      node.vNode?.renderSVG();
      (node as LNode_TextEdit).frame?.redrawPaths();
      manager.spatialIndex.update(node);
      node.save();
    }

    for (const root of currentRoots) {
      (root.vNode as { refreshListBtns?: () => void } | undefined)?.refreshListBtns?.();
      root.vNode?.renderSVG();
      (root as LNode_TextEdit).frame?.redrawPaths();
      manager.spatialIndex.update(root);
    }
  }

  private syncFrameLinks(node: LNode_TextEdit): void {
    const manager = core.nodeManager;
    if (!manager || !node.frame) return;

    const targetLIDs = new Set(node.frame.parentsLID || []);

    for (const p of Array.from(node.frame.parents)) {
      if (!p.node.lID || !targetLIDs.has(p.node.lID)) {
        node.frame.unlinkFromParent(p.node, false);
      }
    }

    for (const lid of targetLIDs) {
      if (!lid) continue;
      const alreadyLinked = Array.from(node.frame.parents).some(
        (p) => p.node.lID === lid,
      );
      if (!alreadyLinked) {
        const parentNode = manager.getNodeByLID(lid) as
          | LNode_TextEdit
          | undefined;
        if (parentNode?.frame) {
          node.frame.linkToParent(parentNode, false);
        }
      }
    }
  }
}

// --- Транзакции перемещения и перестройки списков ---

let activeMoveBefore: Map<string, INodeDB> | null = null;
let activeMoveTrackedNodes = new Set<LNode>();

function collectTreeNodes(seedNodes: Iterable<LNode>, out: Set<LNode>): void {
  for (const node of seedNodes) {
    if (!node) continue;
    out.add(node);
    const root = node.list?.mainParent || node;
    out.add(root);
    root.list?.forEachChildren((child) => {
      out.add(child);
    });
  }
}

export function beginMoveHistoryTransaction(seedNodes: Iterable<LNode>): void {
  activeMoveBefore = new Map<string, INodeDB>();
  activeMoveTrackedNodes.clear();
  captureMoveHistoryNodes(seedNodes);
}

export function captureMoveHistoryNodes(nodes: Iterable<LNode>): void {
  if (!activeMoveBefore) return;
  const expanded = new Set<LNode>();
  collectTreeNodes(nodes, expanded);
  for (const node of expanded) {
    activeMoveTrackedNodes.add(node);
    const key = getNodeKey(node);
    if (key && !activeMoveBefore.has(key)) {
      activeMoveBefore.set(key, toDB(node));
    }
  }
}

export function cancelMoveHistoryTransaction(): void {
  activeMoveBefore = null;
  activeMoveTrackedNodes.clear();
}

export function commitMoveHistoryTransaction(
  extraNodes?: Iterable<LNode>,
): SnapshotDiffCommand | null {
  if (!activeMoveBefore) return null;

  const beforeMap = activeMoveBefore;
  const allNodes = new Set<LNode>(activeMoveTrackedNodes);
  if (extraNodes) {
    collectTreeNodes(extraNodes, allNodes);
  }
  collectTreeNodes(Array.from(allNodes), allNodes);

  activeMoveBefore = null;
  activeMoveTrackedNodes.clear();

  const afterMap = new Map<string, INodeDB>();
  for (const node of allNodes) {
    const key = getNodeKey(node);
    if (key) {
      afterMap.set(key, toDB(node));
    }
  }
  for (const [key, db] of beforeMap) {
    if (!afterMap.has(key)) {
      const live = resolveLiveNode(key, db);
      if (live) {
        afterMap.set(key, toDB(live));
      }
    }
  }

  const command = new SnapshotDiffCommand(beforeMap, afterMap);
  if (command.hasChanges && core.history) {
    core.history.push(command);
    return command;
  }
  return null;
}

// --- Команда редактирования текста ноды без удержания ссылки на LNode ---

export function createTitleHistoryCommand(
  node: LNode_TextEdit,
  oldTitle: string,
  newTitle: string,
): Command {
  const key = getNodeKey(node);
  const applyTitle = (title: string) => {
    const live = resolveLiveNode(key, { _id: node._id }) as
      | LNode_TextEdit
      | undefined;
    if (!live) return;
    live.setTitleText(title, true);
    live.title = title;
    live.save();
  };

  return {
    execute: () => applyTitle(newTitle),
    undo: () => applyTitle(oldTitle),
  };
}
