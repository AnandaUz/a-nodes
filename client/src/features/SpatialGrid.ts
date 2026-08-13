import { VNode } from "@/features/nodes/VNode";

/** пространственный индекс (spatial grid), убирает перебор вообще */
export class SpatialGrid {
  private cellSize: number;
  private cells = new Map<string, Set<VNode>>();

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number) {
    return `${cx},${cy}`;
  }

  private cellsForBBox(bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }) {
    const minCx = Math.floor(bbox.minX / this.cellSize);
    const maxCx = Math.floor(bbox.maxX / this.cellSize);
    const minCy = Math.floor(bbox.minY / this.cellSize);
    const maxCy = Math.floor(bbox.maxY / this.cellSize);
    const result: [number, number][] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        result.push([cx, cy]);
      }
    }
    return result;
  }

  // вызывать при создании/перемещении/ресайзе области
  registerArea(area: VNode) {
    this.unregisterArea(area); // сначала убрать старые записи
    for (const [cx, cy] of this.cellsForBBox({
      minX: area.x,
      minY: area.y,
      maxX: area.x + area.width,
      maxY: area.y + area.height,
    })) {
      const k = this.key(cx, cy);
      if (!this.cells.has(k)) this.cells.set(k, new Set());
      this.cells.get(k)!.add(area);
    }
  }

  unregisterArea(area: VNode) {
    for (const set of this.cells.values()) {
      set.delete(area);
    }
  }

  // получить кандидатов для точки — вместо перебора ВСЕХ областей
  getCandidates(x: number, y: number): VNode[] {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const set = this.cells.get(this.key(cx, cy));
    return set ? [...set] : [];
  }
}
