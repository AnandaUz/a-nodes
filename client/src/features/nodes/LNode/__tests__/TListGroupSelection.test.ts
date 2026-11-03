import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { core } from "@/features/core/core";
import { GRID } from "@/features/core/CONST";
import {
  setupNodeTestEnv,
  createTestTextNode,
  dragNode,
  clickEmptySpace,
  type NodeTestEnv,
} from "./testHelpers";

describe("TListGroup (листГруппа)", () => {
  let env: NodeTestEnv;

  beforeEach(() => {
    env = setupNodeTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("сброс выделения после перетаскивания дочерних нод при клике в свободное место", () => {
    // 1. Создать ноду 1 и два ребёнка с табом 1
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

    const node3 = createTestTextNode({
      lID: 3,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    node3.list.initParent(node1);
    node3.list.tab = 1;

    expect(node1.list.children?.has(node2)).toBe(true);
    expect(node1.list.children?.has(node3)).toBe(true);
    expect(node2.list.parentNode).toBe(node1);
    expect(node3.list.parentNode).toBe(node1);
    expect(node2.list.tab).toBe(1);
    expect(node3.list.tab).toBe(1);

    // 2. Выделяем оба ребёнка
    core.selectManager.selectNode(node2);
    core.selectManager.selectNode(node3, { ctrlKey: true });

    expect(core.selectManager.selectedNodes.has(node2)).toBe(true);
    expect(core.selectManager.selectedNodes.has(node3)).toBe(true);
    expect(core.selectManager.selectedNodes.size).toBe(2);

    // 3. Хватаем и тянем на ноду 1, отпускаем
    dragNode(node2, node1.x, node1.y + 10);

    // 4. Кликаем в свободное от нод место
    clickEmptySpace(600, 600);

    // Выделение должно сниматься с первого клика
    expect(core.selectManager.selectedNodes.size).toBe(0);
  });
});
