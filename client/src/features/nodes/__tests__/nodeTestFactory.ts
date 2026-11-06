import { vi } from "vitest";
import { core } from "@/features/core/core";
import { Store } from "@/features/core/store";
import { GRID } from "@/features/core/CONST";
import { NodeManager } from "@/features/nodes/NodeManager";
import { SelectManager } from "@/features/core/SelectManager/SelectManager";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import type { LNode } from "@/features/nodes/LNode/LNode";
import VTextEdit from "@/features/nodes/VNode/VTextEdit";

export interface NodeTestEnv {
  container: HTMLElement;
  svg: SVGSVGElement;
  cleanup: () => void;
}

export function setupTestNodeEnv(): NodeTestEnv {
  core.store = new Store();
  core.nodeManager = new NodeManager();
  core.nodeManager.init();
  core.selectManager = new SelectManager();

  const container = document.createElement("div");
  document.body.appendChild(container);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  core.desk = {
    nodesEl: container,
    disconnectNodesEl: vi.fn(),
    connectNodesEl: vi.fn(),
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
      state: { x: 0, y: 0 },
    },
    pointer: { x: 0, y: 0 },
  } as any;

  core.history = { execute: vi.fn(), push: vi.fn(), clear: vi.fn() } as any;

  core.nodeRenderer = {
    renderAll: vi.fn(),
    createVNode: (node: any) => {
      const vNode = new VTextEdit(node, container);
      node.vNode = vNode;
      vNode.init();
      vNode.width = 100;
      vNode.height = 30;
      return vNode;
    },
  } as any;

  const cleanup = () => {
    core.selectManager?.unmount();
    core.nodeManager?.clear();
    container.remove();
  };

  return { container, svg, cleanup };
}

export const setupNodeTestEnv = setupTestNodeEnv;

export interface CreateTestNodeOptions {
  container?: HTMLElement;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  lID?: number;
  title?: string;
  isFrame?: boolean;
  parent?: LNode;
  tab?: number;
  index?: number;
}

export function createTestTextNode(
  options: CreateTestNodeOptions = {},
): LNode_TextEdit {
  const node = new LNode_TextEdit();
  if (options.lID !== undefined) {
    node.lID = options.lID;
  } else if (core.nodeManager) {
    node.lID = core.nodeManager.generateLID();
  }
  if (options.x !== undefined) node.x = options.x;
  if (options.y !== undefined) node.y = options.y;
  if (options.title !== undefined) node.title = options.title;
  if (options.isFrame) node.frame.isFrame = true;
  if (options.tab !== undefined) node.list.tab = options.tab;
  if (options.index !== undefined) node.list.index = options.index;

  const container =
    options.container ?? (core.desk as any)?.nodesEl ?? document.body;
  node.vNode = new VTextEdit(node, container);
  node.vNode.init();
  node.vNode.width = options.width ?? 100;
  node.vNode.height = options.height ?? 30;

  core.nodeManager?.registerNode(node);
  core.nodeManager?.spatialIndex.insert(node);

  if (options.parent) {
    if (!options.parent.lID && core.nodeManager) {
      core.nodeManager.ensureLID(options.parent);
    }
    node.list.initParent(options.parent);
  }

  return node;
}

export interface TestTreeSpec {
  title?: string;
  x?: number;
  y?: number;
  lID?: number;
  tab?: number;
  isFrame?: boolean;
  children?: TestTreeSpec[];
}

export function createTestTree(
  spec: TestTreeSpec,
  parent?: LNode_TextEdit,
): LNode_TextEdit {
  const baseX = spec.x ?? (parent ? parent.x + GRID.x * (spec.tab ?? 1) : 100);
  const baseY = spec.y ?? (parent ? parent.y + 30 : 100);
  const node = createTestTextNode({
    title: spec.title ?? "Node",
    x: baseX,
    y: baseY,
    ...(spec.lID !== undefined ? { lID: spec.lID } : {}),
    ...(spec.isFrame !== undefined ? { isFrame: spec.isFrame } : {}),
    ...(spec.tab !== undefined ? { tab: spec.tab } : {}),
    ...(parent ? { parent } : {}),
  });

  if (spec.children?.length) {
    for (const childSpec of spec.children) {
      createTestTree(childSpec, node);
    }
    if (!parent) {
      node.list.setPositionForChildren();
    }
  }

  return node;
}

export function dragNode(
  grabNode: LNode,
  targetX: number,
  targetY: number,
  options?: { shiftKey?: boolean },
): void {
  const shiftKey = options?.shiftKey ?? false;
  core.mode.mouseStatus.shift = shiftKey;
  core.mode.isShiftDrag = shiftKey;
  core.desk.pointer = { x: grabNode.x, y: grabNode.y };
  grabNode.vNode?.onPointerDown(
    new PointerEvent("pointerdown", {
      clientX: grabNode.x,
      clientY: grabNode.y,
      button: 0,
      pointerId: 1,
      shiftKey,
    }),
  );

  grabNode.vNode?.onPointerMove(
    new PointerEvent("pointermove", {
      clientX: grabNode.x + 1,
      clientY: grabNode.y + 1,
      button: 0,
      pointerId: 1,
      shiftKey,
    }),
  );

  core.desk.pointer = { x: targetX, y: targetY };
  const moveTargetEvent = new PointerEvent("pointermove", {
    clientX: targetX,
    clientY: targetY,
    button: 0,
    pointerId: 1,
    shiftKey,
  });
  window.dispatchEvent(moveTargetEvent);
  grabNode.vNode?.onPointerMove(moveTargetEvent);

  const upEvent = new PointerEvent("pointerup", {
    clientX: targetX,
    clientY: targetY,
    button: 0,
    pointerId: 1,
    shiftKey,
  });
  window.dispatchEvent(upEvent);
  grabNode.vNode?.onPointerUp(upEvent);
  core.mode.mouseStatus.shift = false;
  core.mode.isShiftDrag = false;
}

export function clickEmptySpace(x = 600, y = 600): void {
  document.body.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    }),
  );
  window.dispatchEvent(
    new PointerEvent("pointerup", {
      clientX: x,
      clientY: y,
      button: 0,
      pointerType: "mouse",
    }),
  );
}

