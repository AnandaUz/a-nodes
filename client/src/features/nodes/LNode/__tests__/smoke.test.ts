import { describe, it, expect } from "vitest";
import TList from "@/features/nodes/LNode/TList";
import TClones from "@/features/nodes/LNode/TClones";
import { LNode } from "@/features/nodes/LNode/LNode";
import { fromDB } from "@shared/types/INodeDB";
import { NODE_REGISTRY, registerNodeType } from "@/features/nodes/node-registry";

describe("Vitest Smoke Test", () => {
  it("vitest works and executes assertions", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolves path aliases correctly", () => {
    expect(TList).toBeDefined();
    expect(fromDB).toBeDefined();
  });

  it("TClones manages in-memory clones cleanly without window.core", () => {
    const owner = new LNode();
    const clones = new TClones(owner);
    const cloneNode = new LNode();
    clones.nodes.add(cloneNode);
    expect(clones.nodes.size).toBe(1);

    clones.removeAllClones();
    expect(clones.nodes.size).toBe(0);
  });

  it("TList manages in-memory parent/child links without side-effects", () => {
    const parent = new LNode();
    const child = new LNode();

    child.list.initParent(parent);
    expect(parent.list.children?.has(child)).toBe(true);
    expect(child.list.parentNode).toBe(parent);
    expect(child.list.parentLID).toBeUndefined();

    parent.lID = 42;
    child.list.parentNode = parent;
    expect(child.list.parentLID).toBe(42);
  });

  it("node-registry registers node types dynamically", () => {
    class CustomNode extends LNode {}
    registerNodeType(999, CustomNode);
    expect(NODE_REGISTRY[999]).toBe(CustomNode);
  });
});

