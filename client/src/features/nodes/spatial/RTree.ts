export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RTreeLeafEntry<T> extends BBox {
  item: T;
}

export interface RTreeNode<T> extends BBox {
  children: (RTreeNode<T> | RTreeLeafEntry<T>)[];
  leaf: boolean;
  height: number;
}

export function intersects(a: BBox, b: BBox): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

export function bboxArea(b: BBox): number {
  return Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY);
}

export function enlargedArea(a: BBox, b: BBox): number {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.maxX, b.maxX);
  const maxY = Math.max(a.maxY, b.maxY);
  return (maxX - minX) * (maxY - minY);
}

function updateNodeBBox<T>(node: RTreeNode<T>): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    if (child.minX < minX) minX = child.minX;
    if (child.minY < minY) minY = child.minY;
    if (child.maxX > maxX) maxX = child.maxX;
    if (child.maxY > maxY) maxY = child.maxY;
  }

  node.minX = minX;
  node.minY = minY;
  node.maxX = maxX;
  node.maxY = maxY;
}

export class RTree<T> {
  maxEntries: number;
  minEntries: number;
  root: RTreeNode<T>;

  constructor(maxEntries = 16) {
    this.maxEntries = Math.max(4, maxEntries);
    this.minEntries = Math.max(2, Math.ceil(this.maxEntries * 0.4));
    this.root = this.createNode(true, 1);
  }

  clear(): void {
    this.root = this.createNode(true, 1);
  }

  private createNode(leaf: boolean, height: number): RTreeNode<T> {
    return {
      children: [],
      leaf,
      height,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
  }

  insert(item: T, bbox: BBox): void {
    const entry: RTreeLeafEntry<T> = {
      item,
      minX: bbox.minX,
      minY: bbox.minY,
      maxX: bbox.maxX,
      maxY: bbox.maxY,
    };

    const path: RTreeNode<T>[] = [];
    let current = this.root;

    while (!current.leaf) {
      path.push(current);
      let bestIndex = 0;
      let minEnlargement = Infinity;
      let minArea = Infinity;

      for (let i = 0; i < current.children.length; i++) {
        const child = current.children[i] as RTreeNode<T> | undefined;
        if (!child) continue;
        const childArea = bboxArea(child);
        const nextArea = enlargedArea(child, entry);
        const enlargement = nextArea - childArea;

        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          minArea = childArea;
          bestIndex = i;
        } else if (enlargement === minEnlargement && childArea < minArea) {
          minArea = childArea;
          bestIndex = i;
        }
      }

      const nextChild = current.children[bestIndex] as RTreeNode<T> | undefined;
      if (!nextChild) break;
      current = nextChild;
    }

    current.children.push(entry);
    updateNodeBBox(current);

    if (current.children.length > this.maxEntries) {
      this.split(path, current);
    } else {
      for (let i = path.length - 1; i >= 0; i--) {
        const p = path[i];
        if (p) updateNodeBBox(p);
      }
    }
  }

  private split(path: RTreeNode<T>[], node: RTreeNode<T>): void {
    const newNode = this.createNode(node.leaf, node.height);
    const entries = node.children;

    // Guttman quadratic split seeds
    let maxWaste = -Infinity;
    let seed1 = 0;
    let seed2 = 1;

    for (let i = 0; i < entries.length; i++) {
      const eI = entries[i];
      if (!eI) continue;
      for (let j = i + 1; j < entries.length; j++) {
        const eJ = entries[j];
        if (!eJ) continue;
        const waste =
          enlargedArea(eI, eJ) -
          bboxArea(eI) -
          bboxArea(eJ);
        if (waste > maxWaste) {
          maxWaste = waste;
          seed1 = i;
          seed2 = j;
        }
      }
    }

    const e1 = entries[seed1];
    const e2 = entries[seed2];
    if (!e1 || !e2) return;

    const remaining = entries.filter((_, idx) => idx !== seed1 && idx !== seed2);
    node.children = [e1];
    newNode.children = [e2];
    updateNodeBBox(node);
    updateNodeBBox(newNode);

    while (remaining.length > 0) {
      if (node.children.length + remaining.length === this.minEntries) {
        node.children.push(...remaining);
        break;
      }
      if (newNode.children.length + remaining.length === this.minEntries) {
        newNode.children.push(...remaining);
        break;
      }

      let maxDiff = -Infinity;
      let bestIndex = 0;
      let targetNode = node;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        if (!item) continue;
        const d1 = enlargedArea(node, item) - bboxArea(node);
        const d2 = enlargedArea(newNode, item) - bboxArea(newNode);
        const diff = Math.abs(d1 - d2);

        if (diff > maxDiff) {
          maxDiff = diff;
          bestIndex = i;
          if (d1 < d2) {
            targetNode = node;
          } else if (d2 < d1) {
            targetNode = newNode;
          } else if (bboxArea(node) < bboxArea(newNode)) {
            targetNode = node;
          } else if (bboxArea(newNode) < bboxArea(node)) {
            targetNode = newNode;
          } else {
            targetNode =
              node.children.length <= newNode.children.length ? node : newNode;
          }
        }
      }

      const assigned = remaining.splice(bestIndex, 1)[0];
      if (assigned) {
        targetNode.children.push(assigned);
        updateNodeBBox(targetNode);
      }
    }

    updateNodeBBox(node);
    updateNodeBBox(newNode);

    if (path.length === 0) {
      const newRoot = this.createNode(false, node.height + 1);
      newRoot.children = [node, newNode];
      updateNodeBBox(newRoot);
      this.root = newRoot;
    } else {
      const parent = path.pop();
      if (!parent) return;
      parent.children.push(newNode);
      updateNodeBBox(parent);

      if (parent.children.length > this.maxEntries) {
        this.split(path, parent);
      } else {
        for (let i = path.length - 1; i >= 0; i--) {
          const p = path[i];
          if (p) updateNodeBBox(p);
        }
      }
    }
  }

  remove(item: T, bbox: BBox): boolean {
    if (this.root.children.length === 0 || !intersects(bbox, this.root)) {
      return false;
    }

    const stack: { node: RTreeNode<T>; childIndex: number }[] = [
      { node: this.root, childIndex: 0 },
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) break;
      const current = frame.node;

      if (current.leaf) {
        for (let i = 0; i < current.children.length; i++) {
          const entry = current.children[i] as RTreeLeafEntry<T> | undefined;
          if (entry && entry.item === item) {
            current.children.splice(i, 1);
            updateNodeBBox(current);

            for (let p = stack.length - 2; p >= 0; p--) {
              const ancestor = stack[p]?.node;
              if (ancestor) updateNodeBBox(ancestor);
            }

            const firstChild = this.root.children[0];
            if (this.root.children.length === 1 && !this.root.leaf && firstChild) {
              this.root = firstChild as RTreeNode<T>;
            } else if (this.root.children.length === 0) {
              this.root = this.createNode(true, 1);
            }
            return true;
          }
        }
        stack.pop();
      } else {
        if (frame.childIndex < current.children.length) {
          const child = current.children[frame.childIndex] as RTreeNode<T> | undefined;
          frame.childIndex++;
          if (child && intersects(bbox, child)) {
            stack.push({ node: child, childIndex: 0 });
          }
        } else {
          stack.pop();
        }
      }
    }

    return false;
  }

  search(bbox: BBox): T[] {
    const result: T[] = [];
    if (this.root.children.length === 0 || !intersects(bbox, this.root)) {
      return result;
    }

    const stack: RTreeNode<T>[] = [this.root];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.leaf) {
        for (let i = 0; i < current.children.length; i++) {
          const entry = current.children[i] as RTreeLeafEntry<T> | undefined;
          if (entry && intersects(bbox, entry)) {
            result.push(entry.item);
          }
        }
      } else {
        for (let i = 0; i < current.children.length; i++) {
          const child = current.children[i] as RTreeNode<T> | undefined;
          if (child && intersects(bbox, child)) {
            stack.push(child);
          }
        }
      }
    }

    return result;
  }

  searchPoint(x: number, y: number): T[] {
    return this.search({ minX: x, minY: y, maxX: x, maxY: y });
  }

  all(): T[] {
    const result: T[] = [];
    const stack: RTreeNode<T>[] = [this.root];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.leaf) {
        for (let i = 0; i < current.children.length; i++) {
          const entry = current.children[i] as RTreeLeafEntry<T> | undefined;
          if (entry) {
            result.push(entry.item);
          }
        }
      } else {
        for (let i = 0; i < current.children.length; i++) {
          const child = current.children[i] as RTreeNode<T> | undefined;
          if (child) {
            stack.push(child);
          }
        }
      }
    }
    return result;
  }
}
