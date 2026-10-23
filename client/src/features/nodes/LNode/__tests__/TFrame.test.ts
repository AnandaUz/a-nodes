import { describe, it, expect, beforeEach, vi } from "vitest";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import { core } from "@/features/core/core";
import { NodeManager } from "@/features/nodes/NodeManager";
import { Store } from "@/features/core/store";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { GRID } from "@/features/core/CONST";
import { initCommands } from "@/features/core/comands";

describe("TFrame (фрейм)", () => {
  beforeEach(() => {
    core.store = new Store();
    core.nodeManager = new NodeManager();
    core.selectManager = new SelectManager();
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
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    core.desk = {
      selectPath: vi.fn(),
      svgLayer: {
        svg,
      },
    } as any;
  });

  describe("Флаги isFrame и isInFrame", () => {
    it("isFrame по умолчанию false и корректно переключается", () => {
      const node = new LNode_TextEdit();
      expect(node.frame.isFrame).toBe(false);

      node.frame.isFrame = true;
      expect(node.frame.isFrame).toBe(true);

      node.frame.turnOff_frameMode();
      expect(node.frame.isFrame).toBe(false);

      node.frame.turnOn_frameMode();
      expect(node.frame.isFrame).toBe(true);
    });

    it("isInFrame возвращает false для изолированной ноды и для ноды вне фрейма", () => {
      const node = new LNode_TextEdit();
      expect(node.frame.isInFrame).toBe(false);

      const regularParent = new LNode_TextEdit();
      regularParent.frame.isFrame = false;
      node.list.setParent(regularParent, 0);

      expect(node.frame.isInFrame).toBe(false);
    });

    it("isInFrame возвращает true для ноды внутри дерева фрейма", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.frame.isFrame = true;

      const child = new LNode_TextEdit();
      child.list.setParent(frameNode, 0);

      expect(child.frame.isInFrame).toBe(true);

      const grandChild = new LNode_TextEdit();
      grandChild.list.setParent(child, 0);

      expect(grandChild.frame.isInFrame).toBe(true);
    });

    it("frameNode и frameLID возвращают главный родительский узел и его ID", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.lID = 777;
      frameNode.frame.isFrame = true;

      const child = new LNode_TextEdit();
      child.list.setParent(frameNode, 0);

      expect(child.frame.frameNode).toBe(frameNode);
      expect(child.frame.frameLID).toBe(777);
    });
  });

  describe("Связывание подфреймов (linkToParent)", () => {
    it("связывает дочерний фрейм с родительским: добавляет в children и parentsLID", () => {
      const parentFrame = new LNode_TextEdit();
      parentFrame.lID = 100;
      parentFrame.frame.isFrame = true;
      core.nodeManager.nodes.add(parentFrame);

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 101;
      subFrame.frame.isFrame = true;
      core.nodeManager.nodes.add(subFrame);

      subFrame.frame.linkToParent(parentFrame);

      expect(parentFrame.frame.children.has(subFrame)).toBe(true);
      expect(subFrame.frame.parents.size).toBe(1);
      const parentLink = Array.from(subFrame.frame.parents)[0];
      expect(parentLink).toBeDefined();
      expect(parentLink?.node).toBe(parentFrame);
      expect(parentLink?.path).toBeDefined();
      expect(subFrame.frame.parentsLID).toEqual([100]);
    });

    it("автоматически назначает lID через ensureLID при связывании", () => {
      const parentFrame = new LNode_TextEdit();
      parentFrame.frame.isFrame = true;
      const subFrame = new LNode_TextEdit();
      subFrame.frame.isFrame = true;

      expect(parentFrame.lID).toBeUndefined();
      expect(subFrame.lID).toBeUndefined();

      subFrame.frame.linkToParent(parentFrame);

      expect(parentFrame.lID).toBeDefined();
      expect(subFrame.lID).toBeDefined();
      expect(subFrame.frame.parentsLID).toEqual([parentFrame.lID]);
    });

    it("поддерживает связывание с несколькими родительскими фреймами", () => {
      const parentA = new LNode_TextEdit();
      parentA.lID = 201;
      parentA.frame.isFrame = true;

      const parentB = new LNode_TextEdit();
      parentB.lID = 202;
      parentB.frame.isFrame = true;

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 300;
      subFrame.frame.isFrame = true;

      subFrame.frame.linkToParent(parentA);
      subFrame.frame.linkToParent(parentB);

      expect(subFrame.frame.parents.size).toBe(2);
      expect(subFrame.frame.parentsLID).toContain(201);
      expect(subFrame.frame.parentsLID).toContain(202);
      expect(parentA.frame.children.has(subFrame)).toBe(true);
      expect(parentB.frame.children.has(subFrame)).toBe(true);
    });
  });

  describe("Разрыв связей (unlinkFromParent)", () => {
    it("корректно удаляет связь, очищает parentsLID и вызывает path.remove()", () => {
      const parentFrame = new LNode_TextEdit();
      parentFrame.lID = 401;
      parentFrame.frame.isFrame = true;

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 402;
      subFrame.frame.isFrame = true;

      subFrame.frame.linkToParent(parentFrame);
      expect(parentFrame.frame.children.has(subFrame)).toBe(true);

      const firstParent = Array.from(subFrame.frame.parents)[0];
      expect(firstParent).toBeDefined();
      const pathRemoveSpy = vi.spyOn(
        firstParent!.path,
        "remove",
      );

      subFrame.frame.unlinkFromParent(parentFrame);

      expect(pathRemoveSpy).toHaveBeenCalledTimes(1);
      expect(parentFrame.frame.children.has(subFrame)).toBe(false);
      expect(subFrame.frame.parents.size).toBe(0);
      expect(subFrame.frame.parentsLID).toEqual([]);
      expect(subFrame.frame.isFrame).toBe(true);
    });

    it("точечно удаляет только целевого родителя при наличии нескольких", () => {
      const parentA = new LNode_TextEdit();
      parentA.lID = 501;
      parentA.frame.isFrame = true;

      const parentB = new LNode_TextEdit();
      parentB.lID = 502;
      parentB.frame.isFrame = true;

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 503;
      subFrame.frame.isFrame = true;

      subFrame.frame.linkToParent(parentA);
      subFrame.frame.linkToParent(parentB);

      subFrame.frame.unlinkFromParent(parentA);

      expect(parentA.frame.children.has(subFrame)).toBe(false);
      expect(parentB.frame.children.has(subFrame)).toBe(true);
      expect(subFrame.frame.parentsLID).toEqual([502]);
    });
  });

  describe("Защита от некорректных связей (canLinkTo)", () => {
    it("запрещает связывание фрейма с самим собой (self-link)", () => {
      const frame = new LNode_TextEdit();
      frame.lID = 601;
      frame.frame.isFrame = true;

      expect(frame.frame.canLinkTo(frame)).toBe(false);

      frame.frame.linkToParent(frame);
      expect(frame.frame.children.size).toBe(0);
      expect(frame.frame.parents.size).toBe(0);
      expect(frame.frame.parentsLID).toEqual([]);
    });

    it("запрещает связывание, если родитель не является фреймом", () => {
      const nonFrame = new LNode_TextEdit();
      nonFrame.lID = 602;
      nonFrame.frame.isFrame = false;

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 603;
      subFrame.frame.isFrame = true;

      expect(subFrame.frame.canLinkTo(nonFrame)).toBe(false);

      subFrame.frame.linkToParent(nonFrame);
      expect(nonFrame.frame.children.size).toBe(0);
      expect(subFrame.frame.parents.size).toBe(0);
    });

    it("запрещает дублирование связей с одним и тем же родителем", () => {
      const parent = new LNode_TextEdit();
      parent.lID = 604;
      parent.frame.isFrame = true;

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 605;
      subFrame.frame.isFrame = true;

      subFrame.frame.linkToParent(parent);
      expect(subFrame.frame.parents.size).toBe(1);

      expect(subFrame.frame.canLinkTo(parent)).toBe(false);

      subFrame.frame.linkToParent(parent);
      expect(subFrame.frame.parents.size).toBe(1);
      expect(parent.frame.children.size).toBe(1);
    });

    it("предотвращает циклы связывания (родитель не может стать потомком своего потомка)", () => {
      const frameA = new LNode_TextEdit();
      frameA.lID = 701;
      frameA.frame.isFrame = true;

      const frameB = new LNode_TextEdit();
      frameB.lID = 702;
      frameB.frame.isFrame = true;

      const frameC = new LNode_TextEdit();
      frameC.lID = 703;
      frameC.frame.isFrame = true;

      // Цепочка: A -> B -> C
      frameB.frame.linkToParent(frameA);
      frameC.frame.linkToParent(frameB);

      // Прямой цикл: A пытается стать дочерним к B (B -> A)
      expect(frameA.frame.canLinkTo(frameB)).toBe(false);
      frameA.frame.linkToParent(frameB);
      expect(frameB.frame.children.has(frameA)).toBe(false);

      // Косвенный цикл: A пытается стать дочерним к C (C -> A)
      expect(frameA.frame.canLinkTo(frameC)).toBe(false);
      frameA.frame.linkToParent(frameC);
      expect(frameC.frame.children.has(frameA)).toBe(false);
    });
  });

  describe("Восстановление связей при гидрации (init)", () => {
    it("восстанавливает связи с родителями по сохраненным parentsLID", () => {
      const parentA = new LNode_TextEdit();
      parentA.lID = 801;
      parentA.frame.isFrame = true;

      const parentB = new LNode_TextEdit();
      parentB.lID = 802;
      parentB.frame.isFrame = true;

      core.nodeManager.nodes.add(parentA);
      core.nodeManager.nodes.add(parentB);

      const subFrame = new LNode_TextEdit();
      subFrame.lID = 803;
      subFrame.frame.isFrame = true;
      subFrame.frame.parentsLID = [801, 802];
      core.nodeManager.nodes.add(subFrame);

      subFrame.frame.init();

      expect(subFrame.frame.parents.size).toBe(2);
      expect(parentA.frame.children.has(subFrame)).toBe(true);
      expect(parentB.frame.children.has(subFrame)).toBe(true);
    });
  });

  describe("Координация z-index и фона (bringToFront)", () => {
    it("назначает z-index для frameBg и всех дочерних нод выше фона", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.frame.isFrame = true;
      const elFrameBg = document.createElement("div");
      frameNode.vNode = {
        elFrameBg,
        body: document.createElement("div"),
      } as any;

      const child = new LNode_TextEdit();
      child.vNode = {
        body: document.createElement("div"),
      } as any;
      child.list.setParent(frameNode, 0);

      frameNode.frame.bringToFront();

      const bgZ = Number(elFrameBg.style.zIndex);
      const rootZ = Number(frameNode.vNode?.body.style.zIndex);
      const childZ = Number(child.vNode?.body.style.zIndex);

      expect(bgZ).toBeGreaterThanOrEqual(200);
      expect(rootZ).toBe(bgZ + 1);
      expect(childZ).toBe(bgZ + 1);
    });

    it("новые ноды, созданные во фрейме, получают z-index выше существующего фона", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.frame.isFrame = true;
      const elFrameBg = document.createElement("div");
      frameNode.vNode = {
        elFrameBg,
        body: document.createElement("div"),
      } as any;

      const child1 = new LNode_TextEdit();
      child1.vNode = {
        body: document.createElement("div"),
      } as any;
      child1.list.setParent(frameNode, 0);

      // Первый прогон bringToFront
      frameNode.frame.bringToFront();
      const initialBgZ = elFrameBg.style.zIndex;

      // Создаётся новая нода (например, по Enter) внутри фрейма
      const child2 = new LNode_TextEdit();
      child2.vNode = {
        body: document.createElement("div"),
      } as any;
      child2.list.setParent(child1, 0);

      expect(child2.vNode?.body.style.zIndex).toBe("");

      // Вызываем bringToFront от имени новой ноды или фрейма
      child2.frame.bringToFront();

      expect(elFrameBg.style.zIndex).toBe(initialBgZ);
      expect(Number(child2.vNode?.body.style.zIndex)).toBe(
        Number(initialBgZ) + 1,
      );
      expect(Number(child2.vNode?.body.style.zIndex)).toBeGreaterThan(
        Number(elFrameBg.style.zIndex),
      );
    });
  });

  describe("Создание ноды в листГруппе фрейма по горячей клавише 1 (addTextEditNode_underSelected)", () => {
    it("создает новую ноду под выделенной нодой с тем же табом", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.x = 0;
      frameNode.y = 0;
      frameNode.frame.isFrame = true;

      const child1 = new LNode_TextEdit();
      child1.x = GRID.x;
      child1.y = 50;
      child1.list.setParent(frameNode, 0);

      const child2 = new LNode_TextEdit();
      child2.x = GRID.x;
      child2.y = 100;
      child2.list.setParent(frameNode, 1);

      const newNode = core.nodeManager.addTextEditNode_underSelected(child1);

      expect(newNode).not.toBeNull();
      expect(newNode?.list.parentNode).toBe(frameNode);
      expect(newNode?.list.tab).toBe(child1.list.tab);
      expect(newNode?.x).toBe(child1.x);
      expect(child1.list.index).toBe(0);
      expect(newNode?.list.index).toBe(1);
      expect(child2.list.index).toBe(2);
    });

    it("создает новую ноду с тем же табом для глубоко вложенной ноды", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.x = 0;
      frameNode.y = 0;
      frameNode.frame.isFrame = true;

      const child1 = new LNode_TextEdit();
      child1.x = GRID.x;
      child1.y = 50;
      child1.list.setParent(frameNode, 0);

      const grandChild = new LNode_TextEdit();
      grandChild.x = GRID.x * 2;
      grandChild.y = 100;
      grandChild.list.setParent(child1, 0);

      const newNode =
        core.nodeManager.addTextEditNode_underSelected(grandChild);

      expect(newNode).not.toBeNull();
      expect(newNode?.list.parentNode).toBe(child1);
      expect(newNode?.list.tab).toBe(grandChild.list.tab);
      expect(newNode?.x).toBe(grandChild.x);
      expect(newNode?.list.index).toBe(1);
    });

    it("гарантирует, что созданная нода во фрейме имеет z-index выше фона фрейма", () => {
      const frameNode = new LNode_TextEdit();
      frameNode.frame.isFrame = true;
      const elFrameBg = document.createElement("div");
      frameNode.vNode = {
        node: frameNode,
        elFrameBg,
        body: document.createElement("div"),
        renderSVG: vi.fn(),
      } as any;

      const child = new LNode_TextEdit();
      child.x = GRID.x;
      child.list.setParent(frameNode, 0);

      frameNode.frame.bringToFront();

      const newNode = core.nodeManager.addTextEditNode_underSelected(child);

      expect(newNode).not.toBeNull();
      expect(newNode?.vNode?.body.classList.contains("in-frame")).toBe(true);
      expect(Number(newNode?.vNode?.body.style.zIndex)).toBeGreaterThan(
        Number(elFrameBg.style.zIndex),
      );
    });

    it("по нажатию клавиши 1 создает ноду под выделенной нодой в листГруппе", () => {
      initCommands();
      const frameNode = new LNode_TextEdit();
      frameNode.x = 0;
      frameNode.y = 0;
      frameNode.frame.isFrame = true;

      const child = new LNode_TextEdit();
      child.x = GRID.x;
      child.y = 50;
      core.nodeRenderer.createVNode(child);
      child.list.setParent(frameNode, 0);

      core.selectManager.selectNode(child);
      expect(core.selectManager.selectedNodes.size).toBe(1);

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "Digit1",
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(frameNode.list.children?.size).toBe(2);
      const children = Array.from(frameNode.list.children!.values()).sort(
        (a, b) => (a.list.index ?? 0) - (b.list.index ?? 0),
      );
      expect(children[0]).toBe(child);
      const newNode = children[1];
      expect(newNode).toBeDefined();
      expect(newNode?.list.tab).toBe(child.list.tab);
      expect(newNode?.x).toBe(child.x);
    });
  });
});
