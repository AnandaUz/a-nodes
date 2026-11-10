import { NODE_TYPES } from "./node-registry";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "@features/nodes/LNode/LNode_TextEdit";
import type { LNode_TEClone } from "@features/nodes/LNode/LNode_TEClone";

/**
 * @contract
 *   Предусловия: набор узлов nodes загружен из БД или снимка.
 *   Постусловия: восстанавливает двусторонние связи между оригинальными нодами и их клонами (clones.mainNode, clones.sourceNode).
 */
export function initCloneLinks(
  nodes: Iterable<LNode>,
  getNodeByLID: (lID: number) => LNode | undefined,
  getNodeById?: (id: string) => LNode | undefined,
): void {
  const allNodes = [...nodes];
  const clones = allNodes.filter(
    (node) => node.type === NODE_TYPES.TEXT_EDIT_CLONE.id,
  );

  const sourceNodes = new Set<LNode_TextEdit>();

  for (const node of clones as LNode_TEClone[]) {
    let mainNode: LNode_TextEdit | undefined;
    if (node.clones.sourceNodeId) {
      mainNode = (
        getNodeById
          ? getNodeById(node.clones.sourceNodeId)
          : allNodes.find((n) => n._id === node.clones.sourceNodeId)
      ) as LNode_TextEdit | undefined;
    }
    if (!mainNode) {
      mainNode = getNodeByLID(
        node.clones.mainNodeLID || 0,
      ) as LNode_TextEdit;
    }
    if (!mainNode) continue;
    node.clones.mainNode = mainNode;
    if (mainNode._id) {
      node.clones.sourceNodeId = mainNode._id;
    }
    mainNode.clones.nodes.add(node);
    if (mainNode.type === NODE_TYPES.TEXT_EDIT.id) {
      sourceNodes.add(mainNode);
    }
  }

  // для каждого ресурсного устанавливаем все его клоны
  sourceNodes.forEach((sourceNode: LNode) => {
    sourceNode.clones.sourceNode = sourceNode;
    sourceNode.clones.doForAll((cloneNode: LNode) => {
      cloneNode.clones.sourceNode = sourceNode;
      cloneNode.init();
    });
  });
}

