import { describe, it, expect, beforeEach, vi } from "vitest";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";
import { core } from "@/features/core/core";
import { NodeManager } from "@/features/nodes/NodeManager";
import { Store } from "@/features/core/store";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { GRID } from "@/features/core/CONST";

describe("Последовательность отрисовки списка и фона фрейма", () => {
  let container: HTMLElement;

  beforeEach(() => {
    core.store = new Store();
    core.nodeManager = new NodeManager();
    core.selectManager = new SelectManager();

    container = document.createElement("div");
    document.body.appendChild(container);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    core.desk = {
      nodesEl: container,
      selectPath: vi.fn(),
      svgLayer: {
        svg,
        drawRect: vi.fn(),
        removeRect: vi.fn(),
        moveRect: vi.fn(),
      },
    } as any;
  });

  it("высота ноды зависит от таба и класса in-frame, координаты списка зависят от высоты блоков, а фон покрывает всех детей", () => {
    // 1. Корневой фрейм
    const root = new LNode_TextEdit();
    root.lID = 1;
    root.title = "Корень Фрейм";
    root.x = 100;
    root.y = 100;
    root.frame.isFrame = true;
    root.vNode = new VTextEdit(root, container);
    root.vNode.init();
    root.vNode.width = 300;
    root.vNode.height = 40;
    core.nodeManager.nodes.add(root);

    // 2. Первый ребенок (секция 1)
    const section1 = new LNode_TextEdit();
    section1.lID = 2;
    section1.title = "Секция 1";
    section1.x = 100;
    section1.y = 140;
    section1.vNode = new VTextEdit(section1, container);
    section1.vNode.init();
    section1.vNode.width = 200;
    section1.vNode.height = 30;
    section1.list.initParent(root);
    section1.list.index = 0;
    section1.list.tab = 0;
    core.nodeManager.nodes.add(section1);

    // 3. Дочерний элемент секции 1 с табом 1, у которого высота зависит от применения таба
    const item1 = new LNode_TextEdit();
    item1.lID = 3;
    item1.title = "Длинный текст потомка";
    item1.x = 100 + GRID.x;
    item1.y = 170;
    item1.vNode = new VTextEdit(item1, container);
    item1.vNode.init();
    item1.vNode.width = 200;
    item1.vNode.height = 30; // Изначально однострочный
    item1.list.initParent(section1);
    item1.list.index = 0;
    item1.list.tab = 1;
    core.nodeManager.nodes.add(item1);

    // Мокаем refreshBodyRect, чтобы имитировать зависимость размера от таба:
    // при totaltab >= 1 и наличии класса in-frame текст переносится, высота становится 60
    item1.vNode.refreshBodyRect = vi.fn(() => {
      const isTotalTabSet = Boolean(item1.vNode?.body.dataset.totaltab);
      const isInFrame = Boolean(item1.vNode?.body.classList.contains("in-frame"));
      if (isTotalTabSet && isInFrame) {
        item1.vNode!.height = 60;
      } else {
        item1.vNode!.height = 30;
      }
    });

    // 4. Второй ребенок корня (секция 2), идущий следом за секцией 1
    const section2 = new LNode_TextEdit();
    section2.lID = 4;
    section2.title = "Секция 2";
    section2.x = 100;
    section2.y = 200;
    section2.vNode = new VTextEdit(section2, container);
    section2.vNode.init();
    section2.vNode.width = 200;
    section2.vNode.height = 30;
    section2.list.initParent(root);
    section2.list.index = 1;
    section2.list.tab = 0;
    core.nodeManager.nodes.add(section2);

    // Вызываем пересчет геометрии списка
    root.list.setPositionForChildren();

    // Проверка 1: класс in-frame и dataset.totaltab применились ко всем детям
    expect(section1.vNode.body.classList.contains("in-frame")).toBe(true);
    expect(item1.vNode.body.classList.contains("in-frame")).toBe(true);
    expect(item1.vNode.body.dataset.totaltab).toBe("1");
    expect(section2.vNode.body.classList.contains("in-frame")).toBe(true);

    // Проверка 2: высота item1 пересчиталась с учетом таба
    expect(item1.vNode.height).toBe(60);

    // Проверка 3: секция 2 встала на позицию Y строго с учетом высоты item1 (60px)
    // root.y (100) + root.height (40) + section1.height (30) + item1.height (60) = 230
    expect(section2.y).toBe(230);

    // Проверка 4: фон фрейма охватывает всех детей вплоть до конца секции 2
    // bottom = section2.y (230) + section2.height (30) = 260
    // totalHeight = 260 - 100 = 160px
    const bg = root.vNode.elFrameBg;
    expect(bg).not.toBeNull();
    expect(bg?.style.height).toBe("160px");
  });
});

