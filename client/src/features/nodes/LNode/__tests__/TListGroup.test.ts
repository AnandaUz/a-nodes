import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { core } from "@/features/core/core";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { GRID } from "@/features/core/CONST";
import {
  setupNodeTestEnv,
  createTestTextNode,
  dragNode,
  type NodeTestEnv,
} from "./testHelpers";

describe("TList (листГруппа)", () => {
  let env: NodeTestEnv;

  beforeEach(() => {
    env = setupNodeTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("пересортировка при перемещении", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100,
      y: 130,
      container: env.container,
    });
    node2.list.initParent(node1);

    const node3 = createTestTextNode({
      lID: 3,
      x: 100,
      y: 160,
      container: env.container,
    });
    const node4 = createTestTextNode({
      lID: 4,
      x: 100,
      y: 190,
      container: env.container,
    });

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

    dragNode(node3, node2.x, node2.y + 10);

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
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100,
      y: 130,
      container: env.container,
    });
    const node4 = createTestTextNode({
      lID: 4,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    const node3 = createTestTextNode({
      lID: 3,
      x: 100,
      y: 190,
      container: env.container,
    });

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

    // Сдвиг на 2 пикселя
    dragNode(node4, node4.x, node4.y + 2);

    node1.list.checkTree();

    expect(node4.list.parentNode).toBe(node2);
    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node2.list.children?.has(node4)).toBe(true);
    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);

    // Хватаем 3 ноду и перемещаем на 10 пикселей вниз — должна оторваться от дерева
    core.selectManager.selectNode(node3);
    dragNode(node3, node3.x, node3.y + 10);

    node1.list.checkTree();

    expect(node3.list.parentNode).toBeNull();
    expect(node1.list.children?.has(node3)).toBe(false);
  });

  it("перемещение ноды с зажатым Shift меняет таб без перемещения детей и перестраивает структуру", () => {
    // у ноды 1 ребёнок 2 с отступом в один таб и 3 тоже отступ один таб
    // у 3 есть ребёнок 4 с отступом таб
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 130,
      container: env.container,
    });
    const node3 = createTestTextNode({
      lID: 3,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    const node4 = createTestTextNode({
      lID: 4,
      x: 100 + 2 * GRID.x,
      y: 190,
      container: env.container,
    });

    node2.list.initParent(node1);
    node2.list.tab = 1;

    node3.list.initParent(node1);
    node3.list.tab = 1;

    node4.list.initParent(node3);
    node4.list.tab = 1;

    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);
    expect(node3.list.children?.has(node4)).toBe(true);
    expect(node4.list.parentNode).toBe(node3);

    // если я зажимаю шифт и двигаю 3 вправо на один таб
    core.selectManager.selectNode(node3);
    dragNode(node3, node3.x + GRID.x, node3.y, { shiftKey: true });

    // теперь у ноды 2 два ребёнка 3 и 4
    expect(node3.list.parentNode).toBe(node2);
    expect(node4.list.parentNode).toBe(node2);
    expect(node2.list.children?.has(node3)).toBe(true);
    expect(node2.list.children?.has(node4)).toBe(true);
    expect(node3.list.children?.size ?? 0).toBe(0);
    expect(node3.list.index).toBe(0);
    expect(node4.list.index).toBe(1);
    expect(node3.x).toBe(100 + 2 * GRID.x);
    expect(node4.x).toBe(100 + 2 * GRID.x);
  });

  it("перемещение ноды без Shift двигает её детей вместе с ней", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 130,
      container: env.container,
    });
    const node3 = createTestTextNode({
      lID: 3,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    const node4 = createTestTextNode({
      lID: 4,
      x: 100 + 2 * GRID.x,
      y: 190,
      container: env.container,
    });

    node2.list.initParent(node1);
    node2.list.tab = 1;

    node3.list.initParent(node1);
    node3.list.tab = 1;

    node4.list.initParent(node3);
    node4.list.tab = 1;

    // двигаем без шифта
    core.selectManager.selectNode(node3);
    dragNode(node3, node3.x + GRID.x, node3.y, { shiftKey: false });

    // нода 4 должна остаться ребёнком ноды 3 и сдвинуться вместе с ней
    expect(node3.list.parentNode).toBe(node2);
    expect(node4.list.parentNode).toBe(node3);
    expect(node3.list.children?.has(node4)).toBe(true);
    expect(node4.x).toBe(100 + 3 * GRID.x);
  });

  it("ограничение сдвига для существующего ребёнка максимум 2 при перемещении", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 130,
      container: env.container,
    });

    node2.list.initParent(node1);
    node2.list.tab = 1;

    core.selectManager.selectNode(node2);
    dragNode(node2, 100 + 4 * GRID.x, node2.y);

    expect(node2.list.parentNode).toBe(node1);
    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node2.x).toBe(100 + 2 * GRID.x);
  });

  it("элемент не добавляется в дерево при сдвиге больше 2 если он не ребёнок", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 500,
      y: 500,
      container: env.container,
    });

    core.selectManager.selectNode(node2);
    dragNode(node2, 100 + 3 * GRID.x, node1.y + 10);

    expect(node2.list.parentNode).toBeNull();
    expect(node1.list.children?.has(node2)).toBeFalsy();
  });

  it("элемент добавляется в дерево если он не ребёнок и сдвиг не превышает 2", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 500,
      y: 500,
      container: env.container,
    });

    core.selectManager.selectNode(node2);
    dragNode(node2, 100 + GRID.x, node1.y + 10);

    expect(node2.list.parentNode).toBe(node1);
    expect(node1.list.children?.has(node2)).toBe(true);
  });
});
