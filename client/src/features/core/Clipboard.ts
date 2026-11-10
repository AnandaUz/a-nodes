import type { LNode } from "../nodes/LNode/LNode";
import { toDB, type INodeDB } from "@shared/types/INodeDB";
import { cloneExDataForCopy } from "@shared/types/IExData";

export class Clipboard {
  nodesToPlainText(nodes: LNode[]): string {
    const sortedNodes = [...nodes].sort(
      (a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0),
    );

    const lines: string[] = [];
    let prevBottom: number | null = null;

    for (const node of sortedNodes) {
      const rawTitle =
        (node.clones?.sourceNode ? node.clones.sourceNode.title : node.title) ??
        "";

      const tab = node.list?.tab ?? 0;
      const indent = tab > 0 ? " ".repeat(tab * 2) : "";
      const line = `${indent}${rawTitle}`;

      const nodeY = node.y ?? 0;
      const nodeHeight = node.vNode?.height || 26;

      if (
        prevBottom !== null &&
        nodeY - prevBottom > 20 &&
        lines.length > 0 &&
        lines[lines.length - 1] !== ""
      ) {
        lines.push("");
      }

      lines.push(line);
      prevBottom = Math.max(prevBottom ?? nodeY, nodeY + nodeHeight);
    }

    return lines.join("\n");
  }

  async copyVNode(nodes: LNode[]) {
    // Копируем только непосредственно переданные (выделенные) ноды
    const selectedNodes = nodes;
    const selectedLIDs = new Set<number>();
    selectedNodes.forEach((n) => {
      if (n.lID !== undefined) selectedLIDs.add(n.lID);
    });

    // Человеко-читаемый вид — для вставки в блокнот/Word/TG
    const plainText = this.nodesToPlainText(selectedNodes);

    // Сериализуем ноды в формат INodeDB. Связи с родителем сохраняем ТОЛЬКО если родитель тоже скопирован.
    const nodesData: INodeDB[] = selectedNodes.map((n) => {
      const db = toDB(n);
      if (db.exData) {
        db.exData = cloneExDataForCopy(db.exData);
      }
      // Если родитель не среди скопированных нод, сбрасываем привязку к родителю
      if (n.list?.parentLID && !selectedLIDs.has(n.list.parentLID)) {
        db.L = undefined;
        db.x = n.x;
        db.y = n.y;
      }
      return db;
    });

    // Структурированные данные — для вставки в своё приложение
    const appData = JSON.stringify({ type: "a-nodes", nodes: nodesData });

    const item = new ClipboardItem({
      "text/plain": new Blob([plainText], { type: "text/plain" }),
      "text/html": new Blob(
        [
          `<span data-a-nodes="${this.escapeHtml(appData)}" style="white-space: pre-wrap;">${this.escapeHtmlText(plainText)}</span>`,
        ],
        { type: "text/html" },
      ),
    });

    try {
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(plainText);
    }
  }

  private escapeHtmlText(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private escapeHtml(str: string): string {
    return str.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  }

  async paste(): Promise<{ nodes?: INodeDB[]; text?: string }> {
    const items = await navigator.clipboard.read();

    for (const item of items) {
      if (item.types.includes("text/html")) {
        const blob = await item.getType("text/html");
        const html = await blob.text();

        const match = html.match(/data-a-nodes="([^"]+)"/);
        if (match) {
          try {
            const data = JSON.parse(this.unescapeHtml(match[1] || ""));
            if (data.type === "a-nodes") {
              return { nodes: data.nodes };
            }
          } catch {}
        }
      }
    }

    // fallback — обычный текст
    const text = await navigator.clipboard.readText();
    return { text };
  }

  private unescapeHtml(str: string): string {
    return str.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  }
}
