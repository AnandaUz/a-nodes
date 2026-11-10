import { core } from "@features/core/core";
import { toDB, type INodeDB } from "@shared/types/INodeDB";
import { cloneExDataForCopy } from "@shared/types/IExData";
import { instantiateSubgraph } from "../../nodes/nodeSerialization";
import { importNodesFromMarkdown } from "../../nodes/deskExportImport";
import Tools from "../Tools";
import type { LNode } from "../../nodes/LNode/LNode";
import { isTextEditNode, isCloneNode } from "../../nodes/nodeGuards";
import type { LNode_TextEdit } from "../../nodes/LNode/LNode_TextEdit";
import { BatchCommand } from "../history";
import type { UICommand } from "./types";

export const clipboardCommands: UICommand[] = [
  {
    label: "Копировать",
    description: "Копировать выделенные ноды в буфер",
    shortcuts: ["ctrl+c", "cmd+c"],
    execute: () => {
      if (core.mode.textEditing) return;
      const nodes = Array.from(core.selectManager.selectedNodes.values()).sort(
        (a, b) => (a.y ?? 0) - (b.y ?? 0),
      );

      core.clipboard.copyVNode(nodes);
    },
  },
  {
    label: "Вырезать",
    description: "Вырезать выделенные ноды в буфер",
    shortcuts: ["ctrl+x", "cmd+x"],
    execute: () => {
      if (core.mode.textEditing) return;
      const nodes = Array.from(core.selectManager.selectedNodes.values()).sort(
        (a, b) => (a.y ?? 0) - (b.y ?? 0),
      );

      core.clipboard.copyVNode(nodes);
      const deleteCommands = nodes.map((node) =>
        core.nodeManager.createDeleteCommand(node, false),
      );
      nodes.forEach((node) => {
        core.nodeManager.putNodeInTrash(node);
      });
      if (deleteCommands.length > 0) {
        core.history.push(new BatchCommand(deleteCommands));
      }
      core.selectManager.clearSelection();
    },
  },
  {
    label: "Вставить",
    description: "Вставить ноды из буфера обмена",
    shortcuts: ["ctrl+v", "cmd+v"],
    execute: async () => {
      if (core.mode.textEditing) return;
      const clipboardData = await core.clipboard.paste();
      if (!clipboardData) return;

      if (!clipboardData.nodes || clipboardData.nodes.length === 0) {
        if (clipboardData.text && clipboardData.text.trim()) {
          const pointerPos = core.desk.viewport.screenToWorld(
            core.desk.pointer.x,
            core.desk.pointer.y,
          );
          const importedNodes = importNodesFromMarkdown(
            clipboardData.text,
            pointerPos,
          );
          if (importedNodes.length > 0) {
            core.selectManager.clearSelection();
            importedNodes.forEach((node) => {
              core.selectManager.selectNode(node, { ctrlKey: true });
            });
            core.history.push({
              execute: () => {
                importedNodes.forEach((node) =>
                  core.nodeManager.restoreNodeFromTrash(node),
                );
              },
              undo: () => {
                importedNodes.forEach((node) =>
                  core.nodeManager.putNodeInTrash(node),
                );
              },
            });
            core.selectManager.transformMove.start();
          }
        }
        return;
      }

      const rawNodes = clipboardData.nodes;

      let minX = Infinity;
      let minY = Infinity;
      rawNodes.forEach((n) => {
        if (n.x !== undefined && n.x < minX) minX = n.x;
        if (n.y !== undefined && n.y < minY) minY = n.y;
      });

      if (minX === Infinity) minX = 0;
      if (minY === Infinity) minY = 0;

      const pointerPos = core.desk.viewport.screenToWorld(
        core.desk.pointer.x,
        core.desk.pointer.y,
      );
      const offset = {
        x: pointerPos.x - minX,
        y: pointerPos.y - minY,
      };

      core.selectManager.clearSelection();

      const createdNodes = instantiateSubgraph(
        core.nodeManager,
        rawNodes,
        offset,
      );

      // Выделяем все вставленные ноды
      createdNodes.forEach((node) => {
        core.selectManager.selectNode(node, { ctrlKey: true });
      });

      if (createdNodes.length > 0) {
        core.history.push({
          execute: () => {
            createdNodes.forEach((node) =>
              core.nodeManager.restoreNodeFromTrash(node),
            );
          },
          undo: () => {
            createdNodes.forEach((node) =>
              core.nodeManager.putNodeInTrash(node),
            );
          },
        });

        core.selectManager.transformMove.start();
      }
    },
  },
  {
    label: "создать копию",
    description: "Дублировать выделенные ноды со смещением",
    shortcuts: ["ctrl+d", "cmd+d"],
    execute: async (e) => {
      if (core.mode.textEditing) return;
      Tools.stopEvent(e);
      const nodes = Array.from(core.selectManager.selectedNodes.values());
      if (nodes.length === 0) return;

      const subgraphNodes = new Set<LNode>();
      for (const node of nodes) {
        subgraphNodes.add(node);
        node.list.forEachChildren((child) => {
          subgraphNodes.add(child);
        });
      }

      const selectedLIDs = new Set<number>();
      for (const n of subgraphNodes) {
        if (n.list.children?.size || (n as LNode_TextEdit).frame?.isFrame) {
          core.nodeManager.ensureLID(n);
        }
        if (n.lID !== undefined) {
          selectedLIDs.add(n.lID);
        }
      }

      const rawNodes: INodeDB[] = Array.from(subgraphNodes).map((n) => {
        const db = toDB(n);
        if (db.exData) {
          db.exData = cloneExDataForCopy(db.exData);
        }
        if (n.list?.parentLID && !selectedLIDs.has(n.list.parentLID)) {
          db.L = undefined;
          db.x = n.x;
          db.y = n.y;
        }
        return db;
      });

      core.selectManager.clearSelection();

      const newNodes = instantiateSubgraph(core.nodeManager, rawNodes, {
        x: 0,
        y: 0,
      });

      if (newNodes.length === 0) return;

      newNodes.forEach((newNode) => {
        core.selectManager.selectNode(newNode, { ctrlKey: true });
      });

      core.history.push({
        execute: () => {
          newNodes.forEach((node) =>
            core.nodeManager.restoreNodeFromTrash(node),
          );
        },
        undo: () => {
          newNodes.forEach((node) => core.nodeManager.putNodeInTrash(node));
        },
      });

      core.selectManager.transformMove.start();
    },
  },
  {
    label: "создать клона",
    description: "Создать зависимый клон ноды (alt+d)",
    shortcuts: ["alt+d"],
    execute: async (e) => {
      Tools.stopEvent(e);
      const nodes = Array.from(core.selectManager.selectedNodes.values());

      const newNodes: LNode[] = [];
      nodes.forEach((node) => {
        if (!isTextEditNode(node) && !isCloneNode(node)) return;

        const nNode = core.nodeManager.create_TextEditCloneNode(
          node,
          node.x,
          node.y,
        );
        if (nNode) {
          newNodes.push(nNode);
        }
      });

      core.selectManager.clearSelection();
      newNodes.forEach((newNode) => {
        core.selectManager.selectNode(newNode, {
          ctrlKey: true,
        });
      });
      if (newNodes.length > 0) {
        core.history.push({
          execute: () => {
            newNodes.forEach((node) =>
              core.nodeManager.restoreNodeFromTrash(node),
            );
          },
          undo: () => {
            newNodes.forEach((node) => core.nodeManager.putNodeInTrash(node));
          },
        });
      }
      core.selectManager.transformMove.start();
    },
  },
];
