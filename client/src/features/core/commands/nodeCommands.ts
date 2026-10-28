import { core } from "@features/core/core";
import { NODE_TYPES } from "../../nodes/node-registry";
import Tools from "../Tools";
import type { LNode_TextEdit } from "../../nodes/LNode/LNode_TextEdit";
import { BatchCommand } from "../history";
import type { UICommand } from "./types";

export const nodeCommands: UICommand[] = [
  {
    label: "Нода",
    children: [
      {
        label: "Создать",
        children: [
          {
            label: "Текстовую ноду",
            shortcuts: ["1"],
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);

              const selectedNodes = Array.from(
                core.selectManager.selectedNodes.values(),
              );
              if (selectedNodes.length === 1) {
                const selectedNode = selectedNodes[0] as LNode_TextEdit;
                const isNodeInList = !!(
                  selectedNode.list?.parentNode ||
                  (selectedNode as any).frame?.isInFrame ||
                  (selectedNode as any).frame?.isFrame ||
                  (selectedNode.list?.hasChildren &&
                    selectedNode.list.children!.size > 0)
                );
                if (isNodeInList) {
                  const newNode =
                    core.nodeManager.addTextEditNode_underSelected(selectedNode);
                  if (newNode) {
                    core.history.push({
                      execute: () =>
                        core.nodeManager.restoreNodeFromTrash(newNode),
                      undo: () => core.nodeManager.putNodeInTrash(newNode),
                    });
                  }
                  return;
                }
              }

              const newNode =
                core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                  NODE_TYPES.TEXT_EDIT.id,
                );
              if (newNode) {
                core.history.push({
                  execute: () => core.nodeManager.restoreNodeFromTrash(newNode),
                  undo: () => core.nodeManager.putNodeInTrash(newNode),
                });
              }
            },
          },
          {
            label: "страничную ноду",
            shortcuts: ["2"],
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);
              const newNode =
                core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                  NODE_TYPES.PAGE.id,
                );
              if (newNode) {
                core.history.push({
                  execute: () => core.nodeManager.restoreNodeFromTrash(newNode),
                  undo: () => core.nodeManager.putNodeInTrash(newNode),
                });
              }
            },
          },
          {
            label: "Фрейм",
            shortcuts: ["3"],
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);
              const node =
                core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                  NODE_TYPES.TEXT_EDIT.id,
                );
              if (node && (node as any).frame) {
                (node as any).frame.turnOn_frameMode();
                node.save();
                core.history.push({
                  execute: () => core.nodeManager.restoreNodeFromTrash(node),
                  undo: () => core.nodeManager.putNodeInTrash(node),
                });
              }
            },
          },
        ],
      },
      {
        label: "удалить",
        shortcuts: ["x", "delete"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const nodes = Array.from(core.selectManager.selectedNodes.values());
          if (nodes.length === 0) return;
          const deleteCommands = nodes.map((node) =>
            core.nodeManager.createDeleteCommand(node, false),
          );
          nodes.forEach((node) => {
            core.nodeManager.putNodeInTrash(node, false);
          });
          core.history.push(new BatchCommand(deleteCommands));
          core.selectManager.clearSelection();
        },
      },
      {
        label: "удалить c клонами",
        shortcuts: ["shift+x", "shift+delete"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const nodes = Array.from(core.selectManager.selectedNodes.values());
          if (nodes.length === 0) return;
          const deleteCommands = nodes.map((node) =>
            core.nodeManager.createDeleteCommand(node, true),
          );
          nodes.forEach((node) => {
            core.nodeManager.putNodeInTrash(node, true);
          });
          core.history.push(new BatchCommand(deleteCommands));
          core.selectManager.clearSelection();
        },
      },
      {
        label: "Двигать ноду(ы)",
        shortcuts: ["g"],
        execute: () => {
          if (core.mode.textEditing) return;
          core.selectManager.transformMove.start();
        },
      },
    ],
  },
];
