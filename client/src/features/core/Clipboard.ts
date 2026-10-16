import type { LNode } from "../nodes/LNode/LNode";
import VTextEdit from "../nodes/VNode/VTextEdit";
import VTextEditClone from "../nodes/VNode/VTextEditClone";

export class Clipboard {
  async copyVNode(nodes: LNode[]) {
    // человеко-читаемый вид — для вставки в блокнот/Word
    const plainText = nodes
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
      .join("\n");

    // структурированные данные — для вставки в своё приложение
    const appData = JSON.stringify({ type: "a-nodes", nodes });

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

  async paste(): Promise<{ nodes?: LNode[]; text?: string }> {
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
              return { nodes: data.node };
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
