import { core } from "../core/core";
import type { NodeManager } from "./NodeManager";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";

export function validateNodeGraph(manager: NodeManager): string[] {
  const errors: string[] = [];
  const seenLIDs = new Map<number, LNode>();

  for (const node of manager.nodes) {
    if (node.lID !== undefined && node.lID > 0) {
      const prev = seenLIDs.get(node.lID);
      if (prev && prev !== node) {
        errors.push(`Дубликат lID=${node.lID}: "${prev.title}" и "${node.title}"`);
      } else {
        seenLIDs.set(node.lID, node);
      }

      const indexed = manager.nodesByLID.get(node.lID);
      if (indexed && indexed !== node) {
        errors.push(`Рассинхрон nodesByLID для lID=${node.lID}`);
      }
    }

    const parent = node.list.parentNode;
    if (parent) {
      if (!parent.list.children?.has(node)) {
        errors.push(
          `Нода [${node.lID}] "${node.title}" ссылается на parent [${parent.lID}], но отсутствует в parent.list.children`,
        );
      }
      if (parent.lID && node.list.parentLID !== parent.lID) {
        errors.push(
          `Рассинхрон parentLID у ноды [${node.lID}]: parentLID=${node.list.parentLID}, но parent.lID=${parent.lID}`,
        );
      }
    }

    if (node.list.children?.size) {
      for (const child of node.list.children) {
        if (child.list.parentNode !== node) {
          errors.push(
            `Ребёнок [${child.lID}] "${child.title}" в children у [${node.lID}], но child.list.parentNode !== parent`,
          );
        }
      }
    }

    // Проверка циклов в TList по цепочке предков
    const visitedList = new Set<LNode>();
    let curr: LNode | null = node;
    while (curr) {
      if (visitedList.has(curr)) {
        errors.push(`Цикл в TList, начиная с ноды [${node.lID}] "${node.title}"`);
        break;
      }
      visitedList.add(curr);
      curr = curr.list.parentNode;
    }

    // Проверка циклов в TFrame.children
    const frameOwner = node as LNode_TextEdit;
    if (frameOwner.frame?.children?.size) {
      const visitedFrames = new Set<LNode_TextEdit>([frameOwner]);
      const stack = Array.from(frameOwner.frame.children);
      while (stack.length > 0) {
        const chFrame = stack.pop()!;
        if (chFrame === frameOwner) {
          errors.push(
            `Цикл в TFrame.children для фрейма [${node.lID}] "${node.title}"`,
          );
          break;
        }
        if (visitedFrames.has(chFrame)) continue;
        visitedFrames.add(chFrame);
        if (chFrame.frame?.children?.size) {
          stack.push(...chFrame.frame.children);
        }
      }
    }
  }

  if (manager.spatialIndex.size !== manager.nodes.size) {
    errors.push(
      `Рассинхрон SpatialIndex: spatialIndex.size=${manager.spatialIndex.size}, nodes.size=${manager.nodes.size}`,
    );
  }

  return errors;
}

export function dumpNodeTree(root: LNode, indent = ""): string {
  const lid = root.lID ?? "-";
  const title = root.title ?? "";
  const tab = root.list.tab ?? 0;
  const idx = root.list.index ?? "-";
  const line = `${indent}[${lid}] "${title}" (x=${root.x}, y=${root.y}, tab=${tab}, idx=${idx})`;
  const children = root.list.getSortedChildren();
  if (!children.length) return line;
  const childLines = children.map((ch) => dumpNodeTree(ch, indent + "  "));
  return [line, ...childLines].join("\n");
}

if (typeof window !== "undefined") {
  (window as any).__debugNodes = {
    validate: () =>
      core.nodeManager ? validateNodeGraph(core.nodeManager) : [],
    dump: (lID?: number) => {
      if (!core.nodeManager) return "";
      if (lID !== undefined) {
        const n = core.nodeManager.getNodeByLID(lID);
        return n ? dumpNodeTree(n) : `Нода с lID=${lID} не найдена`;
      }
      const roots = [...core.nodeManager.nodes].filter(
        (n) => !n.list.parentNode,
      );
      return roots.map((r) => dumpNodeTree(r)).join("\n\n");
    },
  };
}

