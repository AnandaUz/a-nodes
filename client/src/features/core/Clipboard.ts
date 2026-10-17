import type { LNode } from "../nodes/LNode/LNode";
import VTextEdit from "../nodes/VNode/VTextEdit";
import VTextEditClone from "../nodes/VNode/VTextEditClone";
import { toDB, type INodeDB } from "@shared/types/INodeDB";

export class Clipboard {
  async copyVNode(nodes: LNode[]) {
    // Копируем только непосредственно переданные (выделенные) ноды
    const selectedNodes = nodes;
    const selectedLIDs = new Set<number>();
    selectedNodes.forEach((n) => {
      if (n.lID !== undefined) selectedLIDs.add(n.lID);
    });

    // Человеко-читаемый вид — для вставки в блокнот/Word
    const plainText = selectedNodes
      .map((node) => {
        if (node instanceof VTextEdit) {
          if (node instanceof VTextEditClone) {
            const mainNode = node.clones.sourceNode;
            return mainNode?.title || "";
          }
          return node.title;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    // Сериализуем ноды в формат INodeDB. Связи с родителем сохраняем ТОЛЬКО если родитель тоже скопирован.
    const nodesData: INodeDB[] = selectedNodes.map((n) => {
      const db = toDB(n);
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
          `<span data-a-nodes="${this.escapeHtml(appData)}">${plainText}</span>`,
        ],
        { type: "text/html" },
      ),
    });

    await navigator.clipboard.write([item]);
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
