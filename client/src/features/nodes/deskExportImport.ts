import { core } from "../core/core";
import type { LNode } from "./LNode/LNode";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import { NODE_TYPES } from "./node-registry";
import { toDB, type INodeDB } from "@shared/types/INodeDB";
import { instantiateSubgraph } from "./nodeSerialization";

/**
 * Экспорт набора нод в Markdown.
 * Обход дерева с отступами "  " по list.tab и заголовками "# " для фреймов.
 */
export function exportNodesToMarkdown(nodes: LNode[]): string {
  if (!nodes || nodes.length === 0) return "";

  const nodeSet = new Set(nodes);
  // Находим корневые узлы в выборке (у которых нет родителя среди переданных нод)
  const rootNodes = nodes.filter(
    (n) => !n.list?.parentNode || !nodeSet.has(n.list.parentNode),
  );

  rootNodes.sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));

  const lines: string[] = [];

  function formatLine(node: LNode, depth: number): void {
    const rawTitle =
      (node.clones?.sourceNode ? node.clones.sourceNode.title : node.title) ?? "";
    const isFrame = Boolean(node.frame?.isFrame);

    if (isFrame) {
      const headerPrefix = depth === 0 ? "# " : `${"  ".repeat(depth)}# `;
      lines.push(`${headerPrefix}${rawTitle}`);
    } else {
      const indent = "  ".repeat(depth);
      lines.push(`${indent}- ${rawTitle}`);
    }

    const children = node.list
      ? node.list.getSortedChildren().filter((ch) => nodeSet.has(ch))
      : [];

    for (const child of children) {
      const childTab = child.list?.tab ?? 1;
      formatLine(child, depth + Math.max(1, childTab));
    }
  }

  for (const root of rootNodes) {
    formatLine(root, 0);
  }

  return lines.join("\n");
}

/**
 * Импорт Markdown-текста в структуру узлов TList/TFrame.
 * Парсит отступы и маркеры списков, автоматически привязывает детей через setParent
 * и рассчитывает координаты через setPositionForChildren.
 */
export function importNodesFromMarkdown(
  markdown: string,
  startPos: { x: number; y: number },
): LNode[] {
  if (!markdown || !markdown.trim()) return [];

  const rawLines = markdown.split(/\r?\n/);
  const stack: { node: LNode_TextEdit; level: number }[] = [];
  const createdNodes: LNode_TextEdit[] = [];
  const rootNodes: LNode_TextEdit[] = [];

  let currentY = startPos.y;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    if (!rawLine || !rawLine.trim()) continue;

    // Считаем отступ: таб = 2 пробела
    const leadingWhitespaceMatch = rawLine.match(/^[\t ]*/);
    const leadingWhitespace = leadingWhitespaceMatch
      ? leadingWhitespaceMatch[0]
      : "";
    let spaceCount = 0;
    for (const ch of leadingWhitespace) {
      spaceCount += ch === "\t" ? 2 : 1;
    }
    const level = Math.floor(spaceCount / 2);

    let trimmed = rawLine.trim();
    let isFrame = false;

    if (trimmed.startsWith("#")) {
      isFrame = true;
      trimmed = trimmed.replace(/^#+\s*/, "");
    } else {
      trimmed = trimmed.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
    }

    const newNode = core.nodeManager.createNode({
      x: startPos.x,
      y: currentY,
      type: NODE_TYPES.TEXT_EDIT.id,
    }) as LNode_TextEdit;

    if (!newNode) continue;

    newNode.title = trimmed;
    if (isFrame && newNode.frame) {
      newNode.frame.turnOn_frameMode();
    }

    if (core.nodeRenderer) {
      core.nodeRenderer.createVNode(newNode);
    }

    // Подбираем родителя из стека
    while (
      stack.length > 0 &&
      (stack[stack.length - 1]?.level ?? 0) >= level
    ) {
      stack.pop();
    }

    const topItem = stack[stack.length - 1];
    if (topItem) {
      const parent = topItem.node;
      core.nodeManager.ensureLID(parent);
      const childCount = parent.list.children?.size ?? 0;
      newNode.list.setParent(parent, childCount);
      newNode.list.tab = Math.max(0, level - topItem.level);
    } else {
      rootNodes.push(newNode);
    }

    stack.push({ node: newNode, level });
    createdNodes.push(newNode);
    currentY += 26;
  }

  // Обновляем геометрию всех корневых веток
  for (const root of rootNodes) {
    root.list?.setPositionForChildren();
    root.vNode?.renderSVG();
    root.save();
  }

  return createdNodes;
}

/**
 * Экспорт набора нод в JSON-формат для бэкапа или шаринга.
 */
export function exportNodesToJSON(nodes: LNode[]): string {
  if (!nodes || nodes.length === 0) return "[]";
  const dbs: INodeDB[] = nodes.map((n) => toDB(n));
  return JSON.stringify(dbs, null, 2);
}

/**
 * Импорт нод из JSON-формата на доску.
 */
export function importNodesFromJSON(
  json: string,
  startPos: { x: number; y: number } = { x: 0, y: 0 },
): LNode[] {
  try {
    const rawNodes: INodeDB[] = JSON.parse(json);
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) return [];
    return instantiateSubgraph(core.nodeManager, rawNodes, startPos);
  } catch (err) {
    console.error("[importNodesFromJSON Error]:", err);
    return [];
  }
}
