import { describe, it, expect, beforeEach, vi } from "vitest";
import { core } from "@/features/core/core";
import { Store } from "@/features/core/store";
import { NodeManager } from "@/features/nodes/NodeManager";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import type { LNode } from "@/features/nodes/LNode/LNode";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { GRID } from "@/features/core/CONST";

describe("TList (листГруппа)", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Инициализация базового состояния ядра
    core.store = new Store();
    core.nodeManager = new NodeManager();
    core.nodeManager.init();
    core.selectManager = new SelectManager();

    container = document.createElement("div");
    document.body.appendChild(container);

    // DOM/SVG моки окружения деска
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    core.desk = {
      nodesEl: container,
      selectPath: vi.fn(),
      svgLayer: {
        svg,
        drawRect: vi.fn(() =>
          document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        ),
        removeRect: vi.fn(),
        moveRect: vi.fn(),
        updateRect: vi.fn(),
      },
      viewport: {
        screenToWorld: (x: number, y: number) => ({ x, y }),
      },
      pointer: { x: 0, y: 0 },
    } as any;
    core.history = { execute: vi.fn(), push: vi.fn() } as any;

    // Мок фабрики рендерера визуальных узлов
    core.nodeRenderer = {
      createVNode: (node: any) => {
        const body = document.createElement("div");
        body.className = "vNode";
        node.vNode = {
          node,
          body,
          height: 30,
          titleEl: document.createElement("div"),
          select: vi.fn(),
          unselect: vi.fn(),
          onStop: vi.fn(),
          refreshBodyRect: vi.fn(),
          applyPosition: vi.fn(),
          renderSVG: vi.fn(),
        } as any;
        return node.vNode;
      },
    } as any;
  });

  it("пересортировка при перемещении", () => {
    const node1 = new LNode_TextEdit();
    node1.lID = 1;
    node1.x = 100;
    node1.y = 100;
    node1.vNode = new VTextEdit(node1, container);
    node1.vNode.init();
    node1.vNode.width = 100;
    node1.vNode.height = 30;
    core.nodeManager.nodes.add(node1);

    const node2 = new LNode_TextEdit();
    node2.lID = 2;
    node2.x = 100;
    node2.y = 130;
    node2.vNode = new VTextEdit(node2, container);
    node2.vNode.init();
    node2.vNode.width = 100;
    node2.vNode.height = 30;
    core.nodeManager.nodes.add(node2);

    node2.list.initParent(node1);

    const node3 = new LNode_TextEdit();
    node3.lID = 3;
    node3.x = 100;
    node3.y = 160;
    node3.vNode = new VTextEdit(node3, container);
    node3.vNode.init();
    node3.vNode.width = 100;
    node3.vNode.height = 30;
    core.nodeManager.nodes.add(node3);

    const node4 = new LNode_TextEdit();
    node4.lID = 4;
    node4.x = 100;
    node4.y = 190;
    node4.vNode = new VTextEdit(node4, container);
    node4.vNode.init();
    node4.vNode.width = 100;
    node4.vNode.height = 30;
    core.nodeManager.nodes.add(node4);

    node3.list.initParent(node1);
    node4.list.initParent(node1);

    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);
    expect(node1.list.children?.has(node4)).toBe(true);
    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node4.list.parentNode).toBe(node1);

    core.selectManager.selectNode(node3);
    core.selectManager.selectNode(node4, { ctrlKey: true });

    expect(core.selectManager.selectedNodes.has(node3)).toBe(true);
    expect(core.selectManager.selectedNodes.has(node4)).toBe(true);

    const grabNode = node3;
    const targetNode = node2;
    const targetX = targetNode.x;
    const targetY = targetNode.y + 10;

    core.desk.pointer = { x: grabNode.x, y: grabNode.y };
    grabNode.vNode?.onPointerDown(
      new PointerEvent("pointerdown", {
        clientX: grabNode.x,
        clientY: grabNode.y,
        button: 0,
        pointerId: 1,
      }),
    );

    // Начало движения в точке захвата (стартует TransformMove)
    grabNode.vNode?.onPointerMove(
      new PointerEvent("pointermove", {
        clientX: grabNode.x + 1,
        clientY: grabNode.y + 1,
        button: 0,
        pointerId: 1,
      }),
    );

    // Перемещение через TransformMove к цели
    core.desk.pointer = { x: targetX, y: targetY };
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: targetX,
        clientY: targetY,
        button: 0,
        pointerId: 1,
      }),
    );

    const upEvent = new PointerEvent("pointerup", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      pointerId: 1,
    });
    window.dispatchEvent(upEvent);

    node1.list.checkTree();

    const order: LNode[] = [];
    node1.list.forEachChildren((ch) => order.push(ch));
    expect(order.map((n) => n.lID)).toEqual([2, 3, 4]);

    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node4.list.parentNode).toBe(node1);
    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);
    expect(node1.list.children?.has(node4)).toBe(true);
    expect(node2.list.index).toBe(0);
    expect(node3.list.index).toBe(1);
    expect(node4.list.index).toBe(2);
  });

  it("сохранение иерархии при малом сдвиге дочерней ноды", () => {
    const node1 = new LNode_TextEdit();
    node1.lID = 1;
    node1.x = 100;
    node1.y = 100;
    node1.vNode = new VTextEdit(node1, container);
    node1.vNode.init();
    node1.vNode.width = 100;
    node1.vNode.height = 30;
    core.nodeManager.nodes.add(node1);

    const node2 = new LNode_TextEdit();
    node2.lID = 2;
    node2.x = 100;
    node2.y = 130;
    node2.vNode = new VTextEdit(node2, container);
    node2.vNode.init();
    node2.vNode.width = 100;
    node2.vNode.height = 30;
    core.nodeManager.nodes.add(node2);

    const node4 = new LNode_TextEdit();
    node4.lID = 4;
    node4.x = 100 + GRID.x;
    node4.y = 160;
    node4.vNode = new VTextEdit(node4, container);
    node4.vNode.init();
    node4.vNode.width = 100;
    node4.vNode.height = 30;
    core.nodeManager.nodes.add(node4);

    const node3 = new LNode_TextEdit();
    node3.lID = 3;
    node3.x = 100;
    node3.y = 190;
    node3.vNode = new VTextEdit(node3, container);
    node3.vNode.init();
    node3.vNode.width = 100;
    node3.vNode.height = 30;
    core.nodeManager.nodes.add(node3);

    node2.list.initParent(node1);
    node3.list.initParent(node1);
    node4.list.initParent(node2);
    node4.list.tab = 1;

    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node4.list.parentNode).toBe(node2);
    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);
    expect(node2.list.children?.has(node4)).toBe(true);

    core.selectManager.selectNode(node4);
    expect(core.selectManager.selectedNodes.has(node4)).toBe(true);

    const grabNode = node4;
    const targetX = grabNode.x;
    const targetY = grabNode.y + 2;

    core.desk.pointer = { x: grabNode.x, y: grabNode.y };
    grabNode.vNode?.onPointerDown(
      new PointerEvent("pointerdown", {
        clientX: grabNode.x,
        clientY: grabNode.y,
        button: 0,
        pointerId: 1,
      }),
    );

    // Начало движения в точке захвата (стартует TransformMove)
    grabNode.vNode?.onPointerMove(
      new PointerEvent("pointermove", {
        clientX: grabNode.x,
        clientY: grabNode.y + 1,
        button: 0,
        pointerId: 1,
      }),
    );

    // Перемещение через TransformMove к цели (на 2 пикселя вниз)
    core.desk.pointer = { x: targetX, y: targetY };
    grabNode.vNode?.onPointerMove(
      new PointerEvent("pointermove", {
        clientX: targetX,
        clientY: targetY,
        button: 0,
        pointerId: 1,
      }),
    );

    const upEvent = new PointerEvent("pointerup", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      pointerId: 1,
    });
    grabNode.vNode?.onPointerUp(upEvent);

    node1.list.checkTree();

    expect(node4.list.parentNode).toBe(node2);
    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node2.list.children?.has(node4)).toBe(true);
    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);

    // Хватаем 3 ноду и перемещаем на 10 пикселей вниз — должна оторваться от дерева
    core.selectManager.selectNode(node3);
    const grabNode3 = node3;
    const target3X = grabNode3.x;
    const target3Y = grabNode3.y + 10;

    core.desk.pointer = { x: grabNode3.x, y: grabNode3.y };
    grabNode3.vNode?.onPointerDown(
      new PointerEvent("pointerdown", {
        clientX: grabNode3.x,
        clientY: grabNode3.y,
        button: 0,
        pointerId: 1,
      }),
    );

    grabNode3.vNode?.onPointerMove(
      new PointerEvent("pointermove", {
        clientX: grabNode3.x,
        clientY: grabNode3.y + 1,
        button: 0,
        pointerId: 1,
      }),
    );

    core.desk.pointer = { x: target3X, y: target3Y };
    grabNode3.vNode?.onPointerMove(
      new PointerEvent("pointermove", {
        clientX: target3X,
        clientY: target3Y,
        button: 0,
        pointerId: 1,
      }),
    );

    const upEvent3 = new PointerEvent("pointerup", {
      clientX: target3X,
      clientY: target3Y,
      button: 0,
      pointerId: 1,
    });
    grabNode3.vNode?.onPointerUp(upEvent3);

    node1.list.checkTree();

    expect(node3.list.parentNode).toBeNull();
    expect(node1.list.children?.has(node3)).toBe(false);
  });
});
