import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { core } from "@/features/core/core";
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

  it("присоединение ноды 2 ребёнком к ноде 1 при опускании с наездом на 1 пиксель на нижний край", () => {
    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const node2 = createTestTextNode({
      lID: 2,
      x: 100,
      y: 0,
      container: env.container,
    });

    core.selectManager.selectNode(node2);
    dragNode(node2, node1.x, node1.y + (node1.vNode?.height ?? 30) - 1);

    expect(node2.list.parentNode).toBe(node1);
    expect(node1.list.children?.has(node2)).toBe(true);
  });

  it("перемещение ноды 4 на 1 пиксель выше ноды 3 меняет последовательность детей на 2, 4, 3", () => {
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

    node2.list.initParent(node1);
    node3.list.initParent(node1);
    node4.list.initParent(node1);

    core.selectManager.selectNode(node4);
    dragNode(node4, node3.x, node3.y - 1);

    const order: number[] = [];
    node1.list.forEachChildren((ch) => order.push(ch.lID!));
    expect(order).toEqual([2, 4, 3]);
  });
});
