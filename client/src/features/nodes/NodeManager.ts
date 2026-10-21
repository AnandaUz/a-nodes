import { LNode } from "@/features/nodes/LNode/LNode";
import { core, EVENTS } from "../core/core";
import type { DeskSnapshot } from "../core/interfaces";
import Tools from "../core/Tools";
import VTextEdit from "@features/nodes/VNode/VTextEdit";
import { NODE_REGISTRY, NODE_TYPES } from "./node-registry";
import { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";
import { fromDB } from "@shared/types/INodeDB";
import { LNode_Page } from "./LNode/LNode_Page";

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

    let byNode = candidates?.[0];

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
      if (node instanceof LNode_TextEdit && node.frame?.isFrame) {
        frameNodes.push(node);
      } else {
        regularNodes.push(node);
      }
    });

    frameNodes.forEach((fn) => {
      fn.save();
      fn.frame.bringToFront();
      fn.frame.redrawPaths();
    });

    const wasRef = new Set<LNode>();
    if (byNode) {
      // установим его новым родителем
      const willRefParent: LNode[] = [];
      regularNodes.forEach((node, i) => {
        if (overRect.y < byNode.y) {
          const parentNode = byNode.list.parentNode;
          if (parentNode) {
            const index = byNode.list.index || 0;
            // i * 0.01 — небольшое смещение, чтобы сохранить порядок
            willRefParent.push(...node.list.setParent(parentNode, index - 0.6 + i * 0.01));
          }
        } else {
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
        mainParent.list.setPositionForChildren();
        mainParent.list.checkTree();

        mainParent.vNode?.renderSVG();

        // нода добавлена во фрейм — рисуем кнопки включения
        if (mainParent instanceof LNode_TextEdit && mainParent.frame.isFrame) {
          mainParent.frame.initBtns();
          mainParent.frame.setBtnsState();
        }

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
        mainParent.list.setPositionForChildren();
        mainParent.list.checkTree();

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
      this.pageNode = new LNode_Page();
      fromDB(snapshot.pageNode, this.pageNode);
    }

    this.nodes.forEach((node) => {
      node.forCompatibility();

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
      node.list.initParent();
    });

    const applyParentHidden = (node: LNode) => {
      if (node.hidden && node.list.children?.size) {
        node.list.children.forEach((child) => {
          child.hidden = true;
          applyParentHidden(child);
        });
      }
    };
    this.nodes.forEach((node) => {
      if (!node.list.parentNode) {
        applyParentHidden(node);
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
      //собирайем всех ресурсных
      if (mainNode.constructor === LNode_TextEdit) {
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
      if (newNode instanceof LNode_TextEdit) {
        newNode.turnOn_EditTitleMode();
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

    core.serverPersistence.createNode(node, (id: string) => {
      node._id = id;
      this.nodes.add(node);
    });
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
    if (node instanceof LNode_TextEdit && node.clones.mainNode) {
      if (node.clones.mainNode instanceof LNode_TextEdit)
        node.clones.mainNode.frame.turnOff_PowerBtn(node.frame.frameLID);
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

    if (!mainNode.lID) {
      mainNode.lID = this.getMaxLID() + 1;
      mainNode.save();
    }

    cloneNode.clones.mainNode = mainNode;
    mainNode.clones.nodes.add(cloneNode);
    if (mainNode instanceof LNode_TEClone) {
      cloneNode.clones.sourceNode = mainNode.clones.sourceNode;
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
    let parentLID = 1;
    if (node.lID) {
      parentLID = node.lID;
    } else {
      parentLID = this.getMaxLID() + 1;
      node.lID = parentLID;
    }

    node.save();

    node.turnOff_EditTitleMode();
    core.selectManager.clearSelection();

    const options = {
      x: node.x,
      y: node.y + vNode.height,
      title: rightText,
    } as Partial<LNode>;
    if (node instanceof LNode_TEClone) {
      options.type = NODE_TYPES.TEXT_EDIT.id;
    }
    // создаём новую ноду с правым текстом
    const newNode = this.copyNode(node, options) as LNode_TextEdit;
    if (newNode) {
      core.nodeRenderer.createVNode(newNode);

      newNode.list.setParent(node, 0);

      if (node.frame.isInFrame) {
        newNode.frame.addPowerBtns();
      }

      const mainNode = node.list.mainParent;
      if (mainNode) {
        mainNode.list.setPositionForChildren();
      }

      core.selectManager.selectNode(newNode);
      // newVnode?.onStop();
      (newNode as LNode_TextEdit).isCreatedByEnter = true;
      (newNode as LNode_TextEdit).turnOn_EditTitleMode();
    }
  }
}
