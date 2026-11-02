import { describe, it, expect, beforeEach, vi } from "vitest";
import { core } from "@/features/core/core";
import { Store } from "@/features/core/store";
import { NodeManager } from "@/features/nodes/NodeManager";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";

describe("{{TARGET_NAME}}", () => {
  beforeEach(() => {
    // Инициализация базового состояния ядра
    core.store = new Store();
    core.nodeManager = new NodeManager();
    core.selectManager = new SelectManager();

    // DOM/SVG моки окружения деска
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    core.desk = {
      selectPath: vi.fn(),
      svgLayer: {
        svg,
        drawRect: vi.fn(() =>
          document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        ),
        removeRect: vi.fn(),
        moveRect: vi.fn(),
        updateRect: vi.fn(),
      },
      viewport: {
        screenToWorld: (x: number, y: number) => ({ x, y }),
      },
      pointer: { x: 0, y: 0 },
    } as any;

    // Мок фабрики рендерера визуальных узлов
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
  });

  it("базовая инициализация и состояние по умолчанию", () => {
    // TODO: шаги проверки arrange-act-assert
    expect(core.store).toBeDefined();
  });
});
