import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GRID } from "@/features/core/CONST";
import {
  setupNodeTestEnv,
  createTestTextNode,
  type NodeTestEnv,
} from "./testHelpers";

describe("Последовательность отрисовки списка и фона фрейма", () => {
  let env: NodeTestEnv;

  beforeEach(() => {
    env = setupNodeTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("высота ноды зависит от таба и класса in-frame, координаты списка зависят от высоты блоков, а фон покрывает всех детей", () => {
    // 1. Корневой фрейм
    const root = createTestTextNode({
      lID: 1,
      title: "Корень Фрейм",
      x: 100,
      y: 100,
      width: 300,
      height: 40,
      isFrame: true,
      container: env.container,
    });

    // 2. Первый ребенок (секция 1)
    const section1 = createTestTextNode({
      lID: 2,
      title: "Секция 1",
      x: 100,
      y: 140,
      width: 200,
      height: 30,
      container: env.container,
    });
    section1.list.initParent(root);
    section1.list.index = 0;
    section1.list.tab = 0;

    // 3. Дочерний элемент секции 1 с табом 1, у которого высота зависит от применения таба
    const item1 = createTestTextNode({
      lID: 3,
      title: "Длинный текст потомка",
      x: 100 + GRID.x,
      y: 170,
      width: 200,
      height: 30,
      container: env.container,
    });
    item1.list.initParent(section1);
    item1.list.index = 0;
    item1.list.tab = 1;

    // Мокаем refreshBodyRect, чтобы имитировать зависимость размера от таба:
    // при totaltab >= 1 и наличии класса in-frame текст переносится, высота становится 60
    item1.vNode!.refreshBodyRect = vi.fn(() => {
      const isTotalTabSet = Boolean(item1.vNode?.body.dataset.totaltab);
      const isInFrame = Boolean(item1.vNode?.body.classList.contains("in-frame"));
      if (isTotalTabSet && isInFrame) {
        item1.vNode!.height = 60;
      } else {
        item1.vNode!.height = 30;
      }
    });

    // 4. Второй ребенок корня (секция 2), идущий следом за секцией 1
    const section2 = createTestTextNode({
      lID: 4,
      title: "Секция 2",
      x: 100,
      y: 200,
      width: 200,
      height: 30,
      container: env.container,
    });
    section2.list.initParent(root);
    section2.list.index = 1;
    section2.list.tab = 0;

    // Вызываем пересчет геометрии списка
    root.list.setPositionForChildren();

    // Проверка 1: класс in-frame и dataset.totaltab применились ко всем детям
    expect(section1.vNode!.body.classList.contains("in-frame")).toBe(true);
    expect(item1.vNode!.body.classList.contains("in-frame")).toBe(true);
    expect(item1.vNode!.body.dataset.totaltab).toBe("1");
    expect(section2.vNode!.body.classList.contains("in-frame")).toBe(true);

    // Проверка 2: высота item1 пересчиталась с учетом таба
    expect(item1.vNode!.height).toBe(60);

    // Проверка 3: секция 2 встала на позицию Y строго с учетом высоты item1 (60px)
    // root.y (100) + root.height (40) + section1.height (30) + item1.height (60) = 230
    expect(section2.y).toBe(230);

    // Проверка 4: фон фрейма охватывает всех детей вплоть до конца секции 2
    // bottom = section2.y (230) + section2.height (30) = 260
    // totalHeight = 260 - 100 = 160px
    const bg = root.vNode!.elFrameBg;
    expect(bg).not.toBeNull();
    expect(bg?.style.height).toBe("160px");
  });
});
