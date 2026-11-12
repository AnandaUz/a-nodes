import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { core } from "@/features/core/core";
import { GRID } from "@/features/core/CONST";
import {
  setupNodeTestEnv,
  createTestTextNode,
  type NodeTestEnv,
} from "./testHelpers";
import { DropSlotService } from "@/features/nodes/DropSlotService";
import { handleSelectedNodesMoved } from "@/features/nodes/nodeHierarchy";

describe("DropSlotService и индикатор вставки", () => {
  let env: NodeTestEnv;

  beforeEach(() => {
    env = setupNodeTestEnv();
    DropSlotService.getInstance().clear();
  });

  afterEach(() => {
    DropSlotService.getInstance().clear();
    env.cleanup();
  });

  it("рассчитывает слот и отображает индикатор со сдвигом globalTab при одиночном перемещении", () => {
    const root = createTestTextNode({
      lID: 1,
      x: 100,
      y: 100,
      container: env.container,
    });
    const child1 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 130,
      container: env.container,
    });
    child1.list.initParent(root);
    child1.list.tab = 1;

    const movingNode = createTestTextNode({
      lID: 3,
      x: 100 + 2 * GRID.x,
      y: 120,
      container: env.container,
    });

    const slot = DropSlotService.getInstance().calculateSlot(
      new Set([movingNode]),
      false,
    );

    expect(slot).not.toBeNull();
    expect(slot?.root).toBe(root);
    expect(slot?.globalTab).toBe(2);
    expect(slot?.indicatorX).toBe(100 + 2 * GRID.x);
    expect(slot?.slotY).toBe(130);

    DropSlotService.getInstance().update(new Set([movingNode]), false);
    const indicator = core.desk.nodesEl.querySelector(
      ".dnd-drop-slot-indicator",
    ) as SVGSVGElement | null;

    expect(indicator).not.toBeNull();
    expect(indicator?.style.display).toBe("block");
    const circle = indicator?.querySelector("circle");
    const line = indicator?.querySelector("line");
    expect(circle?.getAttribute("stroke")).toBe("#2097D3");
    expect(line?.getAttribute("stroke")).toBe("#2097D3");
    expect(line?.getAttribute("y1")).toBe("5");
    expect(line?.getAttribute("y2")).toBe("5");
    expect(line?.getAttribute("x2")).toBe("120");
  });

  it("рассчитывает слот и отображает индикатор при групповом перемещении нескольких нод", () => {
    const root = createTestTextNode({
      lID: 10,
      x: 200,
      y: 100,
      container: env.container,
    });
    const child = createTestTextNode({
      lID: 11,
      x: 200 + GRID.x,
      y: 130,
      container: env.container,
    });
    child.list.initParent(root);

    const moveA = createTestTextNode({
      lID: 20,
      x: 200 + GRID.x,
      y: 140,
      container: env.container,
    });
    const moveB = createTestTextNode({
      lID: 21,
      x: 200 + GRID.x,
      y: 170,
      container: env.container,
    });

    core.selectManager.selectNode(moveA);
    core.selectManager.selectNode(moveB, { ctrlKey: true });
    expect(core.selectManager.selectedNodes.size).toBe(2);

    DropSlotService.getInstance().update(
      core.selectManager.selectedNodes,
      false,
    );
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.root).toBe(root);
    expect(slot?.globalTab).toBe(1);

    const indicator = core.desk.nodesEl.querySelector(
      ".dnd-drop-slot-indicator",
    ) as SVGSVGElement | null;
    expect(indicator?.style.display).toBe("block");
  });

  it("во фрейме перемещение ноды 3 на первое место среди детей ноды 1 ставит ее первой", () => {
    const frame = createTestTextNode({
      lID: 100,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 130,
      container: env.container,
    });
    node1.list.initParent(frame);
    node1.list.index = 0;
    node1.list.tab = 0;

    const node2 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    node2.list.initParent(node1);
    node2.list.index = 0;
    node2.list.tab = 1;

    const node3 = createTestTextNode({
      lID: 3,
      x: 100 + GRID.x,
      y: 190,
      container: env.container,
    });
    node3.list.initParent(node1);
    node3.list.index = 1;
    node3.list.tab = 1;

    // Пользователь тащит ноду 3 перед нодой 2
    node3.x = 100 + GRID.x;
    node3.y = 155; // между node1 (bottom 160) и node2 (top 160)

    const slot = DropSlotService.getInstance().calculateSlot(
      new Set([node3]),
      false,
    );

    expect(slot).not.toBeNull();
    expect(slot?.targetParent).toBe(node1);
    expect(slot?.insertIndex).toBe(0);
    expect(slot?.isBefore).toBe(true);
    expect(slot?.byNode).toBe(node2);

    core.selectManager.selectNode(node3);
    DropSlotService.getInstance().update(new Set([node3]), false);
    handleSelectedNodesMoved(core.nodeManager);

    expect(node3.list.parentNode).toBe(node1);
    expect(node3.list.index).toBe(0);
    expect(node2.list.index).toBe(1);
    const sorted = node1.list.getSortedChildren();
    expect(sorted[0]).toBe(node3);
    expect(sorted[1]).toBe(node2);
  });

  it("вытаскивание ноды с дочерним элементом из фрейма отклеивает ее от фрейма", () => {
    const frame = createTestTextNode({
      lID: 100,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const node1 = createTestTextNode({
      lID: 1,
      x: 100,
      y: 130,
      container: env.container,
    });
    node1.list.initParent(frame);
    node1.list.index = 0;
    node1.list.tab = 0;

    const node2 = createTestTextNode({
      lID: 2,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    node2.list.initParent(node1);
    node2.list.index = 0;
    node2.list.tab = 1;

    // Пользователь перемещает node1 наружу фрейма
    const dx = 400;
    const dy = 400;
    node1.x += dx;
    node1.y += dy;
    node1.list.setPositionForChildren(undefined, 0, 0, true, true);

    core.selectManager.clearSelection();
    core.selectManager.selectNode(node1);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);

    const slot = DropSlotService.getInstance().getLastSlot();
    expect(slot).toBeNull();

    handleSelectedNodesMoved(core.nodeManager);

    expect(node1.list.parentNode).toBeNull();
    expect(node1.frame.isInFrame).toBe(false);
    expect(node2.list.parentNode).toBe(node1);
  });

  it("вытаскивание ноды с дочерним элементом вбок из фрейма отклеивает ее от фрейма", () => {
    const frame = createTestTextNode({
      lID: 200,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const node1 = createTestTextNode({
      lID: 201,
      x: 100,
      y: 130,
      container: env.container,
    });
    node1.list.initParent(frame);
    node1.list.index = 0;
    node1.list.tab = 0;

    const node2 = createTestTextNode({
      lID: 202,
      x: 100 + GRID.x,
      y: 160,
      container: env.container,
    });
    node2.list.initParent(node1);
    node2.list.index = 0;
    node2.list.tab = 1;

    // Пользователь перемещает node1 вправо на свободное место (на 500px, y остаётся 130)
    node1.x += 500;
    node1.list.setPositionForChildren(undefined, 0, 0, true, true);

    core.selectManager.clearSelection();
    core.selectManager.selectNode(node1);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();
    expect(slot).toBeNull();

    handleSelectedNodesMoved(core.nodeManager);

    expect(node1.list.parentNode).toBeNull();
    expect(node1.frame.isInFrame).toBe(false);
    expect(node2.list.parentNode).toBe(node1);
  });

  it("при захвате группы нод индикатор отображается на верхней ноде без дёргания при отпускании", () => {
    const frame = createTestTextNode({
      lID: 300,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const item1 = createTestTextNode({
      lID: 301,
      x: 100,
      y: 130,
      container: env.container,
    });
    item1.list.initParent(frame);
    item1.list.index = 0;
    item1.list.tab = 0;

    const groupParent = createTestTextNode({
      lID: 302,
      x: 100,
      y: 160,
      container: env.container,
    });
    groupParent.list.initParent(frame);
    groupParent.list.index = 1;
    groupParent.list.tab = 0;

    const groupChild = createTestTextNode({
      lID: 303,
      x: 100 + GRID.x,
      y: 190,
      container: env.container,
    });
    groupChild.list.initParent(groupParent);
    groupChild.list.index = 0;
    groupChild.list.tab = 1;

    const siblingAfter = createTestTextNode({
      lID: 304,
      x: 100,
      y: 220,
      container: env.container,
    });
    siblingAfter.list.initParent(frame);
    siblingAfter.list.index = 2;
    siblingAfter.list.tab = 0;

    core.selectManager.clearSelection();
    core.selectManager.selectNode(groupParent);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.slotY).toBe(groupParent.y);

    handleSelectedNodesMoved(core.nodeManager);

    expect(groupParent.y).toBe(160);
    expect(groupChild.y).toBe(190);
  });

  it("перемещение ноды последним ребёнком в корневую ноду без детей делает её ребёнком", () => {
    const targetParent = createTestTextNode({
      lID: 263,
      x: 500,
      y: 100,
      container: env.container,
    });

    const movingNode = createTestTextNode({
      lID: 267,
      x: 500 + GRID.x,
      y: 135,
      container: env.container,
    });

    core.selectManager.clearSelection();
    core.selectManager.selectNode(movingNode);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.targetParent).toBe(targetParent);

    handleSelectedNodesMoved(core.nodeManager);

    expect(movingNode.list.parentNode).toBe(targetParent);
  });

  it("перемещение ноды вровень в корневую ноду без детей отображает индикатор и делает её ребёнком с tab = 0", () => {
    const targetParent = createTestTextNode({
      lID: 270,
      x: 500,
      y: 100,
      container: env.container,
    });

    const movingNode = createTestTextNode({
      lID: 271,
      x: 500,
      y: 135,
      container: env.container,
    });

    core.selectManager.clearSelection();
    core.selectManager.selectNode(movingNode);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.targetParent).toBe(targetParent);
    expect(slot?.globalTab).toBe(0);
    expect(slot?.indicatorX).toBe(500);

    const indicator = core.desk.nodesEl.querySelector(
      ".dnd-drop-slot-indicator",
    ) as SVGSVGElement | null;
    expect(indicator?.style.display).toBe("block");

    handleSelectedNodesMoved(core.nodeManager);

    expect(movingNode.list.parentNode).toBe(targetParent);
    expect(movingNode.list.tab).toBe(0);
  });

  it("во фрейме перемещение ноды последним ребёнком в ноду делает её ребёнком", () => {
    const frame = createTestTextNode({
      lID: 266,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const targetParent = createTestTextNode({
      lID: 263,
      x: 100,
      y: 130,
      container: env.container,
    });
    targetParent.list.initParent(frame);
    targetParent.list.index = 0;
    targetParent.list.tab = 0;

    const movingNode = createTestTextNode({
      lID: 267,
      x: 100 + GRID.x,
      y: 165,
      container: env.container,
    });

    core.selectManager.clearSelection();
    core.selectManager.selectNode(movingNode);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.targetParent).toBe(targetParent);

    handleSelectedNodesMoved(core.nodeManager);

    expect(movingNode.list.parentNode).toBe(targetParent);
    expect(movingNode.frame.isInFrame).toBe(true);
  });

  it("во фрейме перемещение ноды ребёнком между двумя сиблингами делает её ребёнком предыдущей ноды", () => {
    const frame = createTestTextNode({
      lID: 400,
      x: 100,
      y: 100,
      isFrame: true,
      container: env.container,
    });

    const node1 = createTestTextNode({
      lID: 401,
      x: 100,
      y: 130,
      container: env.container,
    });
    node1.list.initParent(frame);
    node1.list.index = 0;
    node1.list.tab = 0;

    const node2 = createTestTextNode({
      lID: 402,
      x: 100,
      y: 160,
      container: env.container,
    });
    node2.list.initParent(frame);
    node2.list.index = 1;
    node2.list.tab = 0;

    const movingNode = createTestTextNode({
      lID: 403,
      x: 100 + GRID.x,
      y: 145,
      container: env.container,
    });

    core.selectManager.clearSelection();
    core.selectManager.selectNode(movingNode);

    DropSlotService.getInstance().update(core.selectManager.selectedNodes, false);
    const slot = DropSlotService.getInstance().getLastSlot();

    expect(slot).not.toBeNull();
    expect(slot?.targetParent).toBe(node1);

    handleSelectedNodesMoved(core.nodeManager);

    expect(movingNode.list.parentNode).toBe(node1);
    expect(movingNode.frame.isInFrame).toBe(true);
  });
});



