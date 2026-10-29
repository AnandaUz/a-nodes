import type { LNode } from "../LNode/LNode";
import { RTree, type BBox } from "./RTree";

export type { BBox };

export function getNodeBBox(node: LNode): BBox {
  const minX = node.x;
  const minY = node.y;
  const bodyRect = node.vNode?.bodyRect;
  const w =
    bodyRect?.width ??
    (node.vNode && node.vNode.width > 0 ? node.vNode.width : 120);
  const h =
    bodyRect?.height ??
    (node.vNode && node.vNode.height > 0 ? node.vNode.height : 25);
  return {
    minX,
    minY,
    maxX: minX + Math.max(w, 1),
    maxY: minY + Math.max(h, 1),
  };
}

export class SpatialIndex<T = LNode> {
  private rtree: RTree<T>;
  private itemBoxes = new Map<T, BBox>();
  private getBox: (item: T) => BBox;

  constructor(
    getBox: (item: T) => BBox = getNodeBBox as unknown as (item: T) => BBox,
    maxEntries = 16,
  ) {
    this.rtree = new RTree<T>(maxEntries);
    this.getBox = getBox;
  }

  get size(): number {
    return this.itemBoxes.size;
  }

  insert(item: T): void {
    if (this.itemBoxes.has(item)) {
      this.update(item);
      return;
    }
    const box = this.getBox(item);
    this.itemBoxes.set(item, box);
    this.rtree.insert(item, box);
  }

  remove(item: T): boolean {
    const box = this.itemBoxes.get(item);
    if (!box) return false;
    this.itemBoxes.delete(item);
    return this.rtree.remove(item, box);
  }

  update(item: T): void {
    const oldBox = this.itemBoxes.get(item);
    const newBox = this.getBox(item);
    if (oldBox) {
      if (
        oldBox.minX === newBox.minX &&
        oldBox.minY === newBox.minY &&
        oldBox.maxX === newBox.maxX &&
        oldBox.maxY === newBox.maxY
      ) {
        return;
      }
      this.rtree.remove(item, oldBox);
    }
    this.itemBoxes.set(item, newBox);
    this.rtree.insert(item, newBox);
  }

  search(bbox: BBox): T[] {
    return this.rtree.search(bbox);
  }

  searchRect(rect: { x: number; y: number; width: number; height: number }): T[] {
    return this.rtree.search({
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    });
  }

  searchPoint(x: number, y: number): T[] {
    return this.rtree.searchPoint(x, y);
  }

  clear(): void {
    this.itemBoxes.clear();
    this.rtree.clear();
  }

  load(items: Iterable<T>): void {
    this.clear();
    for (const item of items) {
      this.insert(item);
    }
  }
}
