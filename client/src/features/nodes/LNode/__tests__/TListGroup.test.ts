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
});
