import type { LNode } from "./LNode/LNode";

export function getRectForNodes(nodes: Iterable<LNode>): DOMRect {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;

  for (const node of nodes) {
    const vNode = node.vNode;
    if (!vNode) continue;
    const r = vNode.bodyRect;
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.width);
    y1 = Math.max(y1, r.y + r.height);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } as DOMRect;
}

export function gatherSubtree(
  node: LNode,
  visited: Set<LNode> = new Set(),
  result: Set<LNode> = new Set(),
): Set<LNode> {
  if (!node || visited.has(node)) return result;
  visited.add(node);

  if (node.list.children) {
    for (const child of node.list.children) {
      if (child.vNode) {
        result.add(child);
      }
      gatherSubtree(child, visited, result);
    }
  }
  return result;
}

export function applyTreeVisibility(parent: LNode): void {
  if (!parent.list.children?.size) return;
  const list = parent.list;
  parent.list.children.forEach((child) => {
    if (parent.hidden || !list.isListOpen) {
      child.hidden = true;
    } else {
      const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
      if (isRepeat && list.isRepeatsOpen) {
        child.hidden = false;
      } else if (child.hiddenBD && list.isHiddenOpen) {
        child.hidden = false;
      } else if (child.hiddenBD) {
        child.hidden = true;
      }
    }
    applyTreeVisibility(child);
  });
}

export function findNodeByLID(
  nodes: Iterable<LNode>,
  lID: number,
): LNode | undefined {
  for (const node of nodes) {
    if (node.lID === lID) {
      return node;
    }
  }
  return undefined;
}

export function getMaxLID(nodes: Iterable<LNode>): number {
  let max = 1;
  for (const node of nodes) {
    if (node.lID && node.lID > max) {
      max = node.lID;
    }
  }
  return max;
}

export function generateLID(nodes: Iterable<LNode>): number {
  return getMaxLID(nodes) + 1;
}

export function ensureLID(nodes: Iterable<LNode>, node: LNode): number {
  if (!node.lID) {
    node.lID = generateLID(nodes);
    node.save();
  }
  return node.lID;
}
