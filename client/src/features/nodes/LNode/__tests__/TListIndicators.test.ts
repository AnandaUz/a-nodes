import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setupNodeTestEnv,
  createTestTextNode,
  type NodeTestEnv,
} from "./testHelpers";

describe("TList (листГруппа - индикаторы)", () => {
  let env: NodeTestEnv;

  beforeEach(() => {
    env = setupNodeTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("проверка на индикаторы дочерних элементов", () => {
    // 1. создаём ноду 1 2 3
    const node1 = createTestTextNode({ lID: 1, container: env.container });
    const node2 = createTestTextNode({ lID: 2, container: env.container });
    const node3 = createTestTextNode({ lID: 3, container: env.container });

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
    const vNode1 = node1.vNode!;
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
