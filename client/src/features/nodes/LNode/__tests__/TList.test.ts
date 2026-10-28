import { describe, it, expect, vi, beforeEach } from "vitest";
import { LNode } from "@/features/nodes/LNode/LNode";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { core } from "@/features/core/core";
import { NodeManager } from "@/features/nodes/NodeManager";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { Store } from "@/features/core/store";
import { GRID } from "@/features/core/CONST";

describe("TList (листГруппа)", () => {
  beforeEach(() => {
    core.store = new Store();
    core.nodeManager = new NodeManager();
    core.selectManager = new SelectManager();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    core.desk = {
      selectPath: vi.fn(),
      svgLayer: {
        svg,
        drawRect: vi.fn(),
        removeRect: vi.fn(),
        updateRect: vi.fn(),
      },
    } as any;
  });

  it("hasChildren returns false initially and true when children are added", () => {
    const parent = new LNode();
    expect(parent.list.hasChildren).toBe(false);

    const child = new LNode();
    child.list.initParent(parent);

    expect(parent.list.hasChildren).toBe(true);
    expect(parent.list.children?.size).toBe(1);
    expect(parent.list.children?.has(child)).toBe(true);
  });

  it("initParent correctly links child to parent and assigns parentLID", () => {
    const parent = new LNode();
    parent.lID = 101;
    const child = new LNode();
    child.lID = 102;

    child.list.initParent(parent);

    expect(child.list.parentNode).toBe(parent);
    expect(child.list.parentLID).toBe(101);
    expect(parent.list.children?.has(child)).toBe(true);
  });

  it("setParent binds child to parent, sets parentLID, and assigns normalized indices", () => {
    const parent = new LNode();
    parent.lID = 200;

    const child1 = new LNode();
    child1.lID = 201;
    const child2 = new LNode();
    child2.lID = 202;

    child1.list.setParent(parent, 1);
    child2.list.setParent(parent, 2);

    expect(child1.list.parentNode).toBe(parent);
    expect(child1.list.parentLID).toBe(200);
    expect(child2.list.parentNode).toBe(parent);
    expect(child2.list.parentLID).toBe(200);

    expect(parent.list.children?.size).toBe(2);
    expect(parent.list.children?.has(child1)).toBe(true);
    expect(parent.list.children?.has(child2)).toBe(true);

    expect(child1.list.index).toBe(0);
    expect(child2.list.index).toBe(1);
  });

  it("clearParent unbinds child from parent and resets hierarchy state", () => {
    const parent = new LNode();
    parent.lID = 300;
    const child = new LNode();
    child.lID = 301;

    child.list.setParent(parent, 1);
    expect(parent.list.children?.has(child)).toBe(true);
    expect(child.list.parentLID).toBe(300);

    const refreshed = child.list.clearParent();

    expect(refreshed).toContain(parent);
    expect(parent.list.children?.has(child)).toBe(false);
    expect(child.list.parentNode).toBeNull();
    expect(child.list.parentLID).toBeUndefined();
    expect(child.list.index).toBeUndefined();
    expect(child.list.tab).toBe(0);
    expect(parent.list.hasChildren).toBe(false);
  });

  it("parentNode setter directly updates parentLID and notifies onChange listeners", () => {
    const parent = new LNode();
    parent.lID = 400;
    const child = new LNode();

    const onChangeSpy = vi.fn();
    const unsubscribe = child.list.onChange(onChangeSpy);

    child.list.parentNode = parent;
    expect(child.list.parentLID).toBe(400);
    expect(child.list.parentNode).toBe(parent);
    expect(onChangeSpy).toHaveBeenCalledTimes(1);

    child.list.parentNode = null;
    expect(child.list.parentLID).toBeUndefined();
    expect(child.list.parentNode).toBeNull();
    expect(onChangeSpy).toHaveBeenCalledTimes(2);

    unsubscribe();
    child.list.parentNode = parent;
    expect(onChangeSpy).toHaveBeenCalledTimes(2);
  });

  it("moving child from parentA to parentB cleans up parentA.children", () => {
    const parentA = new LNode();
    parentA.lID = 501;
    const parentB = new LNode();
    parentB.lID = 502;
    const child = new LNode();
    child.lID = 503;

    child.list.setParent(parentA, 1);
    expect(parentA.list.children?.has(child)).toBe(true);
    expect(parentB.list.children?.has(child)).toBeFalsy();
    expect(child.list.parentLID).toBe(501);

    child.list.setParent(parentB, 1);
    expect(parentA.list.children?.has(child)).toBe(false);
    expect(parentB.list.children?.has(child)).toBe(true);
    expect(child.list.parentNode).toBe(parentB);
    expect(child.list.parentLID).toBe(502);
  });

  it("node.remove() cleans up link in parent.list.children", () => {
    const parent = new LNode();
    parent.lID = 601;
    const child = new LNode();
    child.lID = 602;

    child.list.initParent(parent);
    expect(parent.list.children?.has(child)).toBe(true);
    expect(parent.list.hasChildren).toBe(true);

    child.remove();

    expect(parent.list.children?.has(child)).toBe(false);
    expect(parent.list.hasChildren).toBe(false);
  });

  it("mainParent ascends tree up to root parent", () => {
    const root = new LNode();
    root.lID = 1;
    const middle = new LNode();
    middle.lID = 2;
    const leaf = new LNode();
    leaf.lID = 3;

    middle.list.initParent(root);
    leaf.list.initParent(middle);

    expect(leaf.list.mainParent).toBe(root);
    expect(middle.list.mainParent).toBe(root);
    expect(root.list.mainParent).toBe(root);
  });

  it("forEachChildren iterates descendants in ascending index order recursively", () => {
    const parent = new LNode();
    const child1 = new LNode();
    const child2 = new LNode();
    const grandChild = new LNode();

    child1.list.setParent(parent, 1);
    child2.list.setParent(parent, 2);
    grandChild.list.setParent(child1, 1);

    const visited: LNode[] = [];
    parent.list.forEachChildren((node) => {
      visited.push(node);
    });

    expect(visited).toEqual([child1, grandChild, child2]);
  });

  it("tracks repeat and hidden children flags", () => {
    const parent = new LNode();
    const childNormal = new LNode();
    const childRepeat = new LNode();
    const childHidden = new LNode();

    childNormal.list.initParent(parent);
    expect(parent.list.hasRepeatChildren()).toBe(false);
    expect(parent.list.hasHiddenChildren()).toBe(false);

    childRepeat.repeatMode.mode = 1;
    childRepeat.list.initParent(parent);
    expect(parent.list.hasRepeatChildren()).toBe(true);

    childHidden.hiddenBD = true;
    childHidden.list.initParent(parent);
    expect(parent.list.hasHiddenChildren()).toBe(true);
  });

  it("totalIndex listener triggers on totalIndex change", () => {
    const node = new LNode();
    const spy = vi.fn();
    const unsubscribe = node.list.onTotalIndexChanged(spy);

    node.list.totalIndex = 5;
    expect(spy).toHaveBeenCalledWith(5);

    node.list.totalIndex = 5; // same value, no duplicate emit
    expect(spy).toHaveBeenCalledTimes(1);

    unsubscribe();
    node.list.totalIndex = 10;
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("isListOpen defaults to true and can be toggled", () => {
    const node = new LNode();
    expect(node.list.isListOpen).toBe(true);

    node.list.isListOpen = false;
    expect(node.list.isListOpen).toBe(false);
  });

  it("toggleHiddenOpen restores visibility of hidden node and its children", () => {
    const container = document.createElement("div");
    const parent = new LNode_TextEdit();
    const parentVNode = new VTextEdit(parent, container);
    parentVNode.init();
    parent.vNode = parentVNode;

    const child = new LNode_TextEdit();
    child.hiddenBD = true;
    child.hidden = true;
    child.list.initParent(parent);
    const childVNode = new VTextEdit(child, container);
    childVNode.init();
    child.vNode = childVNode;

    const grandChild = new LNode_TextEdit();
    grandChild.hiddenBD = false;
    grandChild.hidden = true;
    grandChild.list.initParent(child);
    const grandChildVNode = new VTextEdit(grandChild, container);
    grandChildVNode.init();
    grandChild.vNode = grandChildVNode;

    expect(parent.list.hasHiddenChildren()).toBe(true);
    expect(child.hidden).toBe(true);
    expect(grandChild.hidden).toBe(true);

    // Включаем показ спрятанных
    parentVNode.toggleHiddenOpen();

    expect(parent.list.isHiddenOpen).toBe(true);
    expect(child.hidden).toBe(false);
    expect(grandChild.hidden).toBe(false);

    // Снова скрываем
    parentVNode.toggleHiddenOpen();
    expect(parent.list.isHiddenOpen).toBe(false);
    expect(child.hidden).toBe(true);
    expect(grandChild.hidden).toBe(true);
  });

  it("сбрасывает спрятанность при отрыве ноды из списка в свободное пространство", () => {
    const parent = new LNode();
    parent.lID = 500;
    const child = new LNode();
    child.lID = 501;
    child.hiddenBD = true;
    child.hidden = true;

    child.list.initParent(parent);
    expect(child.list.parentNode).toBe(parent);

    const emitSpy = vi.spyOn(core.store, "emit");
    child.list.clearParent();

    expect(child.hiddenBD).toBe(false);
    expect(child.hidden).toBe(false);
    expect(child.list.parentNode).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith("node:updated", child);
  });

  it("сохраняет спрятанность при отрыве отложенной задачи в свободное пространство", () => {
    const parent = new LNode();
    parent.lID = 600;
    const child = new LNode();
    child.lID = 601;
    child.hiddenBD = true;
    child.hidden = true;
    child.repeatMode.mode = 1;

    child.list.initParent(parent);
    expect(child.list.parentNode).toBe(parent);

    child.list.clearParent();

    expect(child.hiddenBD).toBe(true);
    expect(child.hidden).toBe(true);
    expect(child.list.parentNode).toBeNull();
  });

  it("сохраняет спрятанность при отрыве ноды с установленной датой задержки", () => {
    const parent = new LNode();
    parent.lID = 700;
    const child = new LNode();
    child.lID = 701;
    child.hiddenBD = true;
    child.hidden = true;
    child.repeatMode.date = new Date("2026-10-30");

    child.list.initParent(parent);
    child.list.clearParent();

    expect(child.hiddenBD).toBe(true);
    expect(child.hidden).toBe(true);
    expect(child.list.parentNode).toBeNull();
  });

  it("если таб меньше 0, нода исключается из фрейма", () => {
    const frameNode = new LNode_TextEdit();
    frameNode.frame.isFrame = true;
    frameNode.x = 200;

    const child = new LNode_TextEdit();
    child.x = 100; // левее фрейма

    child.list.setParent(frameNode, 0);

    expect(child.list.parentNode).toBeNull();
    expect(frameNode.list.children?.has(child) ?? false).toBe(false);
  });

  it("нода во фрейме исключается из него при сдвиге левее фрейма (таб < 0) при checkTree", () => {
    const frameNode = new LNode_TextEdit();
    frameNode.frame.isFrame = true;
    frameNode.x = 200;

    const child = new LNode_TextEdit();
    child.x = 240;
    child.list.setParent(frameNode, 0);
    expect(child.list.parentNode).toBe(frameNode);

    child.x = 100; // сдвиг левее фрейма
    frameNode.list.checkTree();

    expect(child.list.parentNode).toBeNull();
    expect(frameNode.list.children?.has(child) ?? false).toBe(false);
  });

  it("при перемещении исключается из фрейма с таб < 0 и попадает в другой фрейм с нормальным табом", () => {
    const frame1 = new LNode_TextEdit();
    frame1.lID = 10;
    frame1.frame.isFrame = true;
    frame1.x = 200;
    frame1.y = 100;
    frame1.vNode = {
      bodyRect: { x: 200, y: 100, width: 200, height: 100 },
      body: document.createElement("div"),
      renderSVG: vi.fn(),
      refreshListBtns: vi.fn(),
    } as any;

    const frame2 = new LNode_TextEdit();
    frame2.lID = 20;
    frame2.frame.isFrame = true;
    frame2.x = 0;
    frame2.y = 100;
    frame2.vNode = {
      bodyRect: { x: 0, y: 100, width: 200, height: 100 },
      body: document.createElement("div"),
      renderSVG: vi.fn(),
      refreshListBtns: vi.fn(),
    } as any;

    core.nodeManager.nodes.add(frame1);
    core.nodeManager.nodes.add(frame2);

    const child = new LNode_TextEdit();
    child.lID = 30;
    child.x = 50; // левее frame1 (таб < 0), но правее frame2 (таб >= 0)
    child.y = 150;
    child.vNode = {
      bodyRect: { x: 50, y: 150, width: 100, height: 30 },
      body: document.createElement("div"),
      refreshBodyRect: vi.fn(),
      applyPosition: vi.fn(),
      renderSVG: vi.fn(),
      refreshListBtns: vi.fn(),
    } as any;
    core.nodeManager.nodes.add(child);

    core.selectManager.selectedNodes.clear();
    core.selectManager.selectedNodes.add(child);

    core.nodeManager.onSelectedNodesMoved();

    expect(child.list.parentNode).toBe(frame2);
    expect(frame2.list.children?.has(child)).toBe(true);
    expect(frame1.list.children?.has(child) ?? false).toBe(false);
    expect(child.list.tab).toBeGreaterThanOrEqual(0);
  });

  it("если таб меньше 0 во всех фреймах, нода полностью исключается из списка и фрейма", () => {
    const frame1 = new LNode_TextEdit();
    frame1.lID = 10;
    frame1.frame.isFrame = true;
    frame1.x = 200;
    frame1.y = 100;
    frame1.vNode = {
      bodyRect: { x: 200, y: 100, width: 200, height: 100 },
      body: document.createElement("div"),
      renderSVG: vi.fn(),
      refreshListBtns: vi.fn(),
    } as any;

    core.nodeManager.nodes.add(frame1);

    const child = new LNode_TextEdit();
    child.lID = 30;
    child.x = 100; // левее frame1
    child.y = 150;
    child.vNode = {
      bodyRect: { x: 100, y: 150, width: 100, height: 30 },
      body: document.createElement("div"),
      refreshBodyRect: vi.fn(),
      applyPosition: vi.fn(),
      renderSVG: vi.fn(),
      refreshListBtns: vi.fn(),
    } as any;
    child.list.initParent(frame1);
    core.nodeManager.nodes.add(child);

    core.selectManager.selectedNodes.clear();
    core.selectManager.selectedNodes.add(child);

    core.nodeManager.onSelectedNodesMoved();

    expect(child.list.parentNode).toBeNull();
    expect(frame1.list.children?.has(child) ?? false).toBe(false);
  });

  it("при удалении родителя дети остаются без родителя и сохраняют свои координаты", () => {
    const parent = new LNode();
    parent.lID = 801;
    parent.x = 100;
    parent.y = 100;

    const child = new LNode();
    child.lID = 802;
    child.x = 140;
    child.y = 150;
    child.list.initParent(parent);

    expect(parent.list.children?.has(child)).toBe(true);

    parent.remove();

    expect(child.list.parentNode).toBeNull();
    expect(child.list.parentLID).toBeUndefined();
    expect(child.x).toBe(140);
    expect(child.y).toBe(150);
    expect(parent.list.children?.has(child) ?? false).toBe(false);
  });

  it("при удалении родителя через putNodeInTrash дети остаются без родителя на своих координатах", () => {
    const parent = new LNode();
    parent.lID = 810;
    parent.x = 200;
    parent.y = 200;

    const child = new LNode();
    child.lID = 811;
    child.x = 240;
    child.y = 250;
    child.list.initParent(parent);

    core.nodeManager.nodes.add(parent);
    core.nodeManager.nodes.add(child);

    core.nodeManager.putNodeInTrash(parent);

    expect(parent.inTrash).toBe(true);
    expect(child.inTrash).toBeFalsy();
    expect(child.list.parentNode).toBeNull();
    expect(child.list.parentLID).toBeUndefined();
    expect(child.x).toBe(240);
    expect(child.y).toBe(250);
  });

  it("при удалении родителя его дети отвязываются, но сохраняют своих потомков", () => {
    const parent = new LNode();
    parent.lID = 820;
    parent.x = 100;
    parent.y = 100;

    const child = new LNode();
    child.lID = 821;
    child.x = 120;
    child.y = 130;
    child.list.initParent(parent);

    const grandChild = new LNode();
    grandChild.lID = 822;
    grandChild.x = 140;
    grandChild.y = 160;
    grandChild.list.initParent(child);

    parent.remove();

    expect(child.list.parentNode).toBeNull();
    expect(child.list.parentLID).toBeUndefined();
    expect(child.x).toBe(120);
    expect(child.y).toBe(130);

    expect(grandChild.list.parentNode).toBe(child);
    expect(grandChild.list.parentLID).toBe(821);
    expect(grandChild.x).toBe(140);
    expect(grandChild.y).toBe(160);
  });

  it("при групповом перетаскивании нескольких нод к родителю они привязываются и выстраиваются по порядку", () => {
    // В браузере вызов setPointerCapture на синтетическом pointerdown выбрасывает исключение
    const originalSetCapture = Element.prototype.setPointerCapture;
    let callCount = 0;
    Element.prototype.setPointerCapture = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount > 1) {
        throw new DOMException("InvalidPointerId");
      }
    });

    try {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const parentNode = new LNode_TextEdit();
      parentNode.lID = 900;
      parentNode.x = 100;
      parentNode.y = 100;
      parentNode.vNode = new VTextEdit(parentNode, container);
      parentNode.vNode.init();
      parentNode.vNode.width = 100;
      parentNode.vNode.height = 30;
      core.nodeManager.nodes.add(parentNode);

      const node1 = new LNode_TextEdit();
      node1.lID = 901;
      node1.x = 100;
      node1.y = 200;
      node1.vNode = new VTextEdit(node1, container);
      node1.vNode.init();
      node1.vNode.width = 100;
      node1.vNode.height = 30;
      core.nodeManager.nodes.add(node1);

      const node2 = new LNode_TextEdit();
      node2.lID = 902;
      node2.x = 100;
      node2.y = 250;
      node2.vNode = new VTextEdit(node2, container);
      node2.vNode.init();
      node2.vNode.width = 100;
      node2.vNode.height = 30;
      core.nodeManager.nodes.add(node2);

      core.nodeManager.init();

      // Выделяем две ноды
      core.selectManager.selectedNodes.add(node1);
      node1.isSelected = true;
      core.selectManager.selectedNodes.add(node2);
      node2.isSelected = true;
      core.mode.selectedVNodeCount = 2;

      core.desk.viewport = {
        screenToWorld: (x: number, y: number) => ({ x, y }),
      } as any;
      core.history = { execute: vi.fn() } as any;

      // Пользователь начинает тащить node1
      core.desk.pointer = { x: 100, y: 200 };
      const downEvent = new PointerEvent("pointerdown", {
        clientX: 100,
        clientY: 200,
        button: 0,
        pointerId: 1,
      });
      node1.vNode.onPointerDown(downEvent);

      // Движение мыши над родителем (y: 110 над parentNode)
      core.desk.pointer = { x: 100, y: 110 };
      const moveEvent = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 110,
        button: 0,
        pointerId: 1,
      });
      node1.vNode.onPointerMove(moveEvent);

      // Симулируем перемещение в TransformMove к родителю
      node1.x = 100;
      node1.y = 110;
      node2.x = 100;
      node2.y = 160;

      const upEvent = new PointerEvent("pointerup", {
        clientX: 100,
        clientY: 110,
        button: 0,
        pointerId: 1,
      });
      // pointerup на window / TransformMove
      (core.selectManager.transformMove as any).onPointerUp(upEvent);

      // Обе ноды должны привязаться к parentNode
      expect(node1.list.parentNode).toBe(parentNode);
      expect(node2.list.parentNode).toBe(parentNode);
      expect(parentNode.list.children?.has(node1)).toBe(true);
      expect(parentNode.list.children?.has(node2)).toBe(true);
      expect(node1.list.index).toBe(0);
      expect(node2.list.index).toBe(1);

      // Ни одна нода не должна остаться в состоянии dragging
      expect(node1.vNode.isDragging).toBe(false);
      expect(node2.vNode.isDragging).toBe(false);
    } finally {
      Element.prototype.setPointerCapture = originalSetCapture;
    }
  });

  it("проверка иерархии при перемещении в листГруп", () => {
    const originalSetCapture = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = vi.fn();

    try {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const node1 = new LNode_TextEdit();
      node1.title = "1";
      node1.lID = 1;
      node1.x = 100;
      node1.y = 100;
      node1.vNode = new VTextEdit(node1, container);
      node1.vNode.init();
      node1.vNode.width = 100;
      node1.vNode.height = 30;
      core.nodeManager.nodes.add(node1);

      const node2 = new LNode_TextEdit();
      node2.title = "2";
      node2.lID = 2;
      node2.x = 100 + GRID.x;
      node2.y = 130;
      node2.vNode = new VTextEdit(node2, container);
      node2.vNode.init();
      node2.vNode.width = 100;
      node2.vNode.height = 30;
      node2.list.setParent(node1, 1);
      node2.list.tab = 1;
      core.nodeManager.nodes.add(node2);

      const node3 = new LNode_TextEdit();
      node3.title = "3";
      node3.lID = 3;
      node3.x = 300;
      node3.y = 100;
      node3.vNode = new VTextEdit(node3, container);
      node3.vNode.init();
      node3.vNode.width = 100;
      node3.vNode.height = 30;
      core.nodeManager.nodes.add(node3);

      const node4 = new LNode_TextEdit();
      node4.title = "4";
      node4.lID = 4;
      node4.x = 300 + GRID.x;
      node4.y = 130;
      node4.vNode = new VTextEdit(node4, container);
      node4.vNode.init();
      node4.vNode.width = 100;
      node4.vNode.height = 30;
      node4.list.setParent(node3, 1);
      node4.list.tab = 1;
      core.nodeManager.nodes.add(node4);

      core.nodeManager.init();

      // Выделяем 3
      core.selectManager.selectedNodes.add(node3);
      node3.isSelected = true;
      core.mode.selectedVNodeCount = 1;

      core.desk.viewport = {
        screenToWorld: (x: number, y: number) => ({ x, y }),
      } as any;
      core.history = { execute: vi.fn() } as any;

      // Пользователь начинает тащить node3
      core.desk.pointer = { x: 300, y: 100 };
      const downEvent = new PointerEvent("pointerdown", {
        clientX: 300,
        clientY: 100,
        button: 0,
        pointerId: 1,
      });
      node3.vNode.onPointerDown(downEvent);

      // Несем к 1 и отпускаем с отступом в один таб
      core.desk.pointer = { x: node1.x + GRID.x, y: node1.y + 10 };
      const moveEvent = new PointerEvent("pointermove", {
        clientX: node1.x + GRID.x,
        clientY: node1.y + 10,
        button: 0,
        pointerId: 1,
      });
      node3.vNode.onPointerMove(moveEvent);

      node3.x = node1.x + GRID.x;
      node3.y = node1.y + 10;
      node4.x = node3.x + GRID.x;
      node4.y = node3.y + 30;

      const upEvent = new PointerEvent("pointerup", {
        clientX: node1.x + GRID.x,
        clientY: node1.y + 10,
        button: 0,
        pointerId: 1,
      });
      node3.vNode.onPointerUp(upEvent);

      // Проверка: у ноды 1 должны быть дети 3 и 2, у 3 — 4
      expect(node3.list.parentNode).toBe(node1);
      expect(node2.list.parentNode).toBe(node1);
      expect(node1.list.children?.has(node3)).toBe(true);
      expect(node1.list.children?.has(node2)).toBe(true);

      // Проверка последовательности: дети располагаются 3, затем 2
      expect(node3.list.index).toBe(0);
      expect(node2.list.index).toBe(1);

      expect(node4.list.parentNode).toBe(node3);
      expect(node3.list.children?.has(node4)).toBe(true);
    } finally {
      Element.prototype.setPointerCapture = originalSetCapture;
    }
  });
});


