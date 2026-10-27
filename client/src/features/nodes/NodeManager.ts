import { LNode } from "@/features/nodes/LNode/LNode";
import { core, EVENTS } from "../core/core";
import { GRID } from "../core/CONST";
import type { DeskSnapshot } from "../core/interfaces";
import Tools from "../core/Tools";
import VTextEdit from "@features/nodes/VNode/VTextEdit";
import { NODE_REGISTRY, NODE_TYPES } from "./node-registry";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import { fromDB } from "@shared/types/INodeDB";
import type { LNode_Page } from "./LNode/LNode_Page";

export class NodeManager {
  nodes = new Set<LNode>();
  pageNode: LNode_Page | undefined;
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
    const selectedNodes = core.selectManager.selectedNodes;
    if (selectedNodes.size < 1) return;

    //// работа со списком

    let movedNodeRect: DOMRect;
    let movedNodes = new Set(selectedNodes.values());

    const visited = new Set();
    const gather = (node: LNode) => {
      if (!node || visited.has(node)) return;
      visited.add(node);

      if (node.list.children) {
        for (const child of node.list.children) {
          if (child.vNode) {
            movedNodes.add(child);
          }
          gather(child);
        }
      }
    };
    selectedNodes.forEach((node) => {
      gather(node);
    });

    movedNodeRect = this.getRectForNodes(movedNodes);
    // movedVNodes = [...selectedVNodes.values()];

    // const scale = core.mode.scale;
    const overRect = {
      x: movedNodeRect.x,
      y: movedNodeRect.y - 1,
      width: movedNodeRect.width,
      height: movedNodeRect.height + 1,
    } as DOMRect;

    const candidates = core.selectManager
      .getNodeOverRect(overRect)
      .filter((node) => !movedNodes.has(node));

    candidates.sort((a, b) => a.y - b.y);

    const selectedParentsNodes: LNode[] = [];
    // оставим только родителей
    const refFunc = (node: LNode) => {
      const parentNode = node.list.parentNode;

      // если нода имеет родителя среди выбранны, но не берём её
      if (parentNode && selectedNodes.has(parentNode)) return;

      selectedParentsNodes.push(node);
    };
    selectedNodes.forEach((node: LNode) => refFunc(node));

    // сортируем по Y по возрастанию, чтобы сохранить визуальный порядок
    selectedParentsNodes.sort((a, b) => a.y - b.y);

    const frameNodes: LNode_TextEdit[] = [];
    const regularNodes: LNode[] = [];
    selectedParentsNodes.forEach((node) => {
      if ((node as any).frame?.isFrame) {
        frameNodes.push(node as LNode_TextEdit);
      } else {
        regularNodes.push(node);
      }
    });

    const validCandidates = candidates.filter((cand) => {
      const candRoot = cand.list.mainParent || cand;
      const refNode = regularNodes[0] || selectedParentsNodes[0];
      if (!refNode) return true;
      const tab = Math.round((refNode.x - candRoot.x) / GRID.x);
      return tab >= 0;
    });

    let byNode = validCandidates?.[0];

    frameNodes.forEach((fn) => {
      fn.save();
      fn.frame.bringToFront();
      fn.frame.redrawPaths();
    });

    const wasRef = new Set<LNode>();
    if (byNode) {
      // установим его новым родителем
      const willRefParent: LNode[] = [];
      const baseIndex = byNode.list.index || 0;
      regularNodes.forEach((node, i) => {
        if (overRect.y < byNode.y && byNode.list.parentNode) {
          const parentNode = byNode.list.parentNode;
          this.ensureLID(parentNode);
          // i * 0.01 — небольшое смещение, чтобы сохранить порядок
          willRefParent.push(
            ...node.list.setParent(parentNode, baseIndex - 0.6 + i * 0.01),
          );
        } else {
          this.ensureLID(byNode);
          willRefParent.push(...node.list.setParent(byNode, i));
        }
        // если клон, активировать кнопку
        // if (node instanceof LNode_TEClone) {
        //   const mainNode = node.clones.mainNode;
        //   const subFrameLID =
        //     byNode.list.mainParent?.list.mainParent?.lID || 0;
        //   if (mainNode && mainNode instanceof LNode_TextEdit) {
        //     (mainNode.vNode as VTextEdit)?.setBtnToActive(subFrameLID);
        //   }
        // }
      });

      willRefParent.forEach((node) => {
        const mainParent = node.list.mainParent;
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);

        const oldPositions = new Map<LNode, { x: number; y: number }>();
        const oldFrameRect =
          (mainParent as any).frame?.isFrame && mainParent.vNode?.elFrameBg
            ? mainParent.getNodeRect()
            : null;
        mainParent.list.forEachChildren((ch) => {
          oldPositions.set(ch, { x: ch.x, y: ch.y });
        });

        mainParent.list.setPositionForChildren(
          undefined,
          0,
          0,
          true,
          false,
          false,
        );
        mainParent.list.checkTree();
        mainParent.list.setPositionForChildren(
          undefined,
          0,
          0,
          true,
          false,
          true,
          oldPositions,
          oldFrameRect,
        );

        // нода добавлена во фрейм — рисуем кнопки включения
        if ((mainParent as any).frame?.isFrame) {
          const fp = mainParent as LNode_TextEdit;
          fp.frame.initBtns();
          fp.frame.setBtnsState();
        }

        mainParent.list.forEachChildren((child) => {
          (child.vNode as any)?.refreshListBtns?.();
        });
        (mainParent.vNode as any)?.refreshListBtns?.();

        mainParent.save();
      });
    } else {
      const willRefParent: LNode[] = [];
      regularNodes.forEach((node) => {
        // если клон, то отключить индикаторы
        const mainParent = (node as LNode_TextEdit).clones.mainNode;
        if (mainParent) {
          const frameLID = node.list.mainParent?.lID || 0;
          node.list.totalIndex = -1;
          (mainParent.vNode as VTextEdit).removePowerIndicators(frameLID);
        }

        willRefParent.push(...node.list.clearParent());

        node.refresh();
        node.vNode?.renderSVG();
      });
      willRefParent.forEach((node) => {
        const mainParent = node.list.mainParent;
        if (!mainParent) return;
        if (wasRef.has(mainParent)) return;
        wasRef.add(mainParent);

        const oldPositions = new Map<LNode, { x: number; y: number }>();
        const oldFrameRect =
          (mainParent as any).frame?.isFrame && mainParent.vNode?.elFrameBg
            ? mainParent.getNodeRect()
            : null;
        mainParent.list.forEachChildren((ch) => {
          oldPositions.set(ch, { x: ch.x, y: ch.y });
        });

        mainParent.list.checkTree();
        mainParent.list.setPositionForChildren(
          undefined,
          0,
          0,
          true,
          false,
          true,
          oldPositions,
          oldFrameRect,
        );

        mainParent.save();
      });
    }
  }

  loadSnapshot(snapshot: DeskSnapshot): void {
    if (!snapshot || !Array.isArray(snapshot.nodes)) return;
    this.nodes.clear();

    for (const nodeData of snapshot.nodes) {
      const { _id } = nodeData;
      if (!_id) continue;
      // адаптация - переделываю тип фреймов, в ноду фрейм
      let isFrameAdaptation = false;
      if (nodeData.type === NODE_TYPES.FRAME.main || nodeData.type === 21) {
        nodeData.type = NODE_TYPES.TEXT_EDIT.id;
        isFrameAdaptation = true;
      }
      const node = this.addNode(nodeData.type || 0);
      if (!node) continue;
      fromDB(nodeData, node);
      this.nodes.add(node);
      // адаптация - переделываю тип фреймов, в ноду фрейм
      if (isFrameAdaptation) {
        (node as LNode_TextEdit).frame.isFrame = true;
        node.save();
      }
    }

    if (snapshot.pageNode) {
      this.pageNode = this.addNode(NODE_TYPES.PAGE.id) as LNode_Page;
      fromDB(snapshot.pageNode, this.pageNode);
    }

    this.nodes.forEach((node) => {
      node.forCompatibility();

      // конвертация старой версии clones
      if (node.exData?.ownerNodesIds) {
        const sourceNodeId = node.exData.ownerNodesIds[0];
        if (sourceNodeId) {
          const mainNode = [...this.nodes.values()].find(
            (n) => n._id === sourceNodeId,
          );
          if (mainNode) {
            this.ensureLID(mainNode);
            node.clones.mainNode = mainNode;
            node.exData.ownerNodesIds = undefined;
            node.save();
          }
        }
      }

      // если дата repeatMode вышла, то показывает
      if (node.repeatMode.date) {
        const now = new Date();
        if (node.repeatMode.date < now && node.hiddenBD) {
          node.hiddenBD = false;
          node.save();
        }
      }
      // показываем кому быть видимым кому нет
      node.hidden = node.hiddenBD;
      if (node.list.parentLID && node.list.parentLID !== node.lID) {
        const parentNode = this.getNodeByLID(node.list.parentLID);
        if (parentNode) {
          node.list.initParent(parentNode);
        }
      }

      // if (node._id === "6ad5d27c642f5c8beef12398") {
      //   console.log(node.title, node._id);
      // }
    });

    const applyTreeVisibility = (parent: LNode) => {
      if (!parent.list.children?.size) return;
      const list = parent.list;
      parent.list.children.forEach((child) => {
        if (parent.hidden || !list.isListOpen) {
          child.hidden = true;
        } else {
          const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
          if (isRepeat && list.isRepeatsOpen) {
            child.hidden = false;
          } else if (child.hiddenBD && list.isHiddenOpen) {
            child.hidden = false;
          } else if (child.hiddenBD) {
            child.hidden = true;
          }
        }
        applyTreeVisibility(child);
      });
    };
    this.nodes.forEach((node) => {
      if (!node.list.parentNode) {
        applyTreeVisibility(node);
      }
    });

    this.initCloneLinks();

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

  initCloneLinks() {
    const clones = [...this.nodes.values()].filter(
      (node) => node.type === NODE_TYPES.TEXT_EDIT_CLONE.id,
    );

    const sourceNodes = new Set<LNode_TextEdit>();

    for (const node of clones as LNode_TEClone[]) {
      const mainNode = this.getNodeByLID(
        node.clones.mainNodeLID || 0,
      ) as LNode_TextEdit;
      if (!mainNode) continue;
      node.clones.mainNode = mainNode;
      mainNode.clones.nodes.add(node);
      if (mainNode.type === NODE_TYPES.TEXT_EDIT.id) {
        sourceNodes.add(mainNode);
      }
    }
    //для каждого ресурсного устанавливаем все его клоны
    sourceNodes.forEach((sourceNode: LNode) => {
      sourceNode.clones.sourceNode = sourceNode;
      sourceNode.clones.doForAll((cloneNode: LNode) => {
        cloneNode.clones.sourceNode = sourceNode;
        cloneNode.init();
      });
    });
  }
  setPositionForAllLinkedChildNodes() {
    for (const node of this.nodes.values()) {
      if (!node.list) continue;
      if (node.list.parentNode) continue;
      if (!node.list.children || node.list.children.size < 1) continue;
      node.list.setPositionForChildren();
    }
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
      });
    } else {
      this.nodes.add(node);
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
  /**
   * получить максимальный lID у всех нод на странице
   * @returns {number}
   */
  getMaxLID() {
    let max = 1;
    for (const node of this.nodes.values()) {
      if (node.lID && node.lID > max) {
        max = node.lID;
      }
    }
    return max;
  }

  generateLID(): number {
    return this.getMaxLID() + 1;
  }

  ensureLID(node: LNode): number {
    if (!node.lID) {
      node.lID = this.generateLID();
      node.save();
    }
    return node.lID;
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
}
