import type { INode } from "@shared/types";
import type { VNode } from "../nodes/VNode";
import VTextEdit from "../nodes/VTextEdit";
import VTextEditClone from "../nodes/VTextEditClone";
import { core } from "./core";

export class Clipboard {
  async copyVNode(vNodes: VNode[]) {
    // человеко-читаемый вид — для вставки в блокнот/Word
    const plainText = vNodes
      .map((vNode) => {
        if (vNode instanceof VTextEdit) {
          if (vNode instanceof VTextEditClone) {
            const mainNode = core.nodeManager.getNode(
              vNode.lNode.exData?.ownerNodesIds?.[0] || "",
            );

            return mainNode?.title || "";
          }
          return vNode.lNode.title;
        }
        return "";
      })
      .join("\n");

    // структурированные данные — для вставки в своё приложение
    const lNode = vNodes.map((vNode) => vNode.lNode);
    const appData = JSON.stringify({ type: "a-nodes", lNode });

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

  async paste(): Promise<{ nodes?: INode[]; text?: string }> {
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
              return { nodes: data.lNode };
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
