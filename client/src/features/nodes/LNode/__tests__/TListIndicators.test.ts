import { describe, it, expect, vi, beforeEach } from "vitest";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { core } from "@/features/core/core";
import { NodeManager } from "@/features/nodes/NodeManager";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { Store } from "@/features/core/store";

describe("TList (листГруппа - индикаторы)", () => {
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

  it("проверка на индикаторы дочерних элементов", () => {
    const container = document.createElement("div");

    // 1. создаём ноду 1 2 3
    const node1 = new LNode_TextEdit();
    node1.lID = 1;
    const vNode1 = new VTextEdit(node1, container);
    vNode1.init();
    node1.vNode = vNode1;

    const node2 = new LNode_TextEdit();
    node2.lID = 2;
    const vNode2 = new VTextEdit(node2, container);
    vNode2.init();
    node2.vNode = vNode2;

    const node3 = new LNode_TextEdit();
    node3.lID = 3;
    const vNode3 = new VTextEdit(node3, container);
    vNode3.init();
    node3.vNode = vNode3;

    // 2. ноды 2 и 3 добавляем детьми к 1
    node2.list.setParent(node1, 1);
    node3.list.setParent(node1, 2);

    // 3. указываем что 2 спрятана
    node2.hiddenBD = true;
    node2.hidden = true;

    // 4. указываем 3 это отложенная задача и тоже прячется
    node3.repeatMode.mode = 1;
    node3.hiddenBD = true;
    node3.hidden = true;

    // Обновляем состояние индикаторов
    vNode1.refreshListBtns();

    // 5. проверяем
    // - индикатора простого сворачивания не должно быть
    expect(vNode1.btnOpen?.style.display).toBe("none");

    // - индикатор спрятанных есть
    expect(vNode1.btnHidden?.style.display).not.toBe("none");

    // - индикатор отложенных есть
    expect(vNode1.btnRepeats?.style.display).not.toBe("none");
  });
});
