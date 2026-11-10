import type { LNode } from "./LNode/LNode";

/**
 * @contract
 *   Предусловия: набор узлов nodes на доске.
 *   Постусловия: находит и возвращает наибольший использованный lID среди нод, их списков, фреймов и клонов.
 */
export function calculateMaxLID(nodes: Iterable<LNode>, currentMax: number): number {
  let max = currentMax;
  for (const node of nodes) {
    if (node.lID && node.lID > max) {
      max = node.lID;
    }
    if (node.list?.parentLID && node.list.parentLID > max) {
      max = node.list.parentLID;
    }
    const frame = node.frame;
    if (frame && Array.isArray(frame.parentsLID)) {
      for (const pid of frame.parentsLID) {
        if (typeof pid === "number" && pid > max) {
          max = pid;
        }
      }
    }
    if (node.clones?.mainNodeLID && node.clones.mainNodeLID > max) {
      max = node.clones.mainNodeLID;
    }
  }
  return max;
}

/**
 * @contract
 *   Предусловия: node существует в графе.
 *   Постусловия: каскадно переназначает lID узла, обновляет ссылки в дочерних узлах, связанных фреймах и клонах.
 * @invariants
 *   Все зависимые структуры обновляются каскадно без разрыва связей.
 */
export function reassignNodeLID(
  nodes: Iterable<LNode>,
  nodesByLID: Map<number, LNode>,
  node: LNode,
  newLID: number,
  getMaxLID: () => number,
): void {
  const oldLID = node.lID;
  if (oldLID === newLID) return;

  if (oldLID && nodesByLID.get(oldLID) === node) {
    nodesByLID.delete(oldLID);
  }
  node.lID = newLID;
  nodesByLID.set(newLID, node);
  getMaxLID();

  // Каскадное обновление детей в списке
  node.list.children?.forEach((child) => {
    if (child.list) {
      child.list.parentLID = newLID;
      child.save();
    }
  });

  // Каскадное обновление связанных фреймов и клонов по всей доске
  if (oldLID) {
    for (const other of nodes) {
      if (other === node) continue;
      let changed = false;

      const frame = other.frame;
      if (
        frame &&
        Array.isArray(frame.parentsLID) &&
        frame.parentsLID.includes(oldLID)
      ) {
        frame.parentsLID = frame.parentsLID.map((id: number) =>
          id === oldLID ? newLID : id,
        );
        changed = true;
      }

      if (other.clones && other.clones.mainNodeLID === oldLID) {
        other.clones.mainNodeLID = newLID;
        changed = true;
      }

      if (other.list?.parentLID === oldLID) {
        other.list.parentLID = newLID;
        changed = true;
      }

      if (changed) {
        other.save();
      }
    }
  }

  node.save();
}

