import { core } from "@features/core/core";
import type { LNode } from "@features/nodes/LNode/LNode";
import { GRID } from "../CONST";
import { BatchCommand } from "../history";
import type { Command as IHistoryCommand } from "../interfaces";
import type { UICommand } from "./types";
import Tools from "../Tools";

let lastHiddenNodes: LNode[] = [];

export const transformCommands: UICommand[] = [
  {
    label: "Трансформации",
    children: [
      {
        label: "Сдвиг по Tab",
        shortcuts: ["tab"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.selectedVNodeCount !== 1) return;
          e.preventDefault();
          const node = core.selectManager.selectedNodes.values().next().value;
          if (!node) return;
          const fromX = node.x;
          node.moveTo({ x: node.x + GRID.x, y: node.y });
          const mainList = node.list.mainParent?.list;
          if (mainList) {
            mainList.checkTree();
            mainList.setPositionForChildren();
          }
          core.history.push({
            execute: () => {
              node.moveTo({ x: fromX + GRID.x, y: node.y });
              const ml = node.list.mainParent?.list;
              if (ml) {
                ml.checkTree();
                ml.setPositionForChildren();
              }
            },
            undo: () => {
              node.moveTo({ x: fromX, y: node.y });
              const ml = node.list.mainParent?.list;
              if (ml) {
                ml.checkTree();
                ml.setPositionForChildren();
              }
            },
          });
        },
      },
      {
        label: "Обратный сдвиг по Tab",
        shortcuts: ["shift+tab"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.selectedVNodeCount !== 1) return;
          e.preventDefault();
          const node = core.selectManager.selectedNodes.values().next().value;
          if (!node) return;
          const fromX = node.x;
          node.moveTo({ x: node.x - GRID.x, y: node.y });
          const mainList = node.list.mainParent?.list;
          if (mainList) {
            mainList.checkTree();
            mainList.setPositionForChildren();
          }
          core.history.push({
            execute: () => {
              node.moveTo({ x: fromX - GRID.x, y: node.y });
              const ml = node.list.mainParent?.list;
              if (ml) {
                ml.checkTree();
                ml.setPositionForChildren();
              }
            },
            undo: () => {
              node.moveTo({ x: fromX, y: node.y });
              const ml = node.list.mainParent?.list;
              if (ml) {
                ml.checkTree();
                ml.setPositionForChildren();
              }
            },
          });
        },
      },
      {
        label: "Включить выключить режим фрейма",
        shortcuts: ["f"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.textEditing) return;
          e.preventDefault();
          const frameCommands: IHistoryCommand[] = [];
          core.selectManager.selectedNodes.forEach((node) => {
            const frame = (node as any).frame;
            if (!frame) return;
            const wasFrame = frame.isFrame;
            if (!wasFrame) {
              frame.turnOn_frameMode();
            } else {
              frame.turnOff_frameMode();
            }

            node.save();
            node.vNode?.render();
            frameCommands.push({
              execute: () => {
                if (wasFrame) frame.turnOff_frameMode();
                else frame.turnOn_frameMode();
                node.save();
                node.vNode?.render();
              },
              undo: () => {
                if (wasFrame) frame.turnOn_frameMode();
                else frame.turnOff_frameMode();
                node.save();
                node.vNode?.render();
              },
            });
          });
          if (frameCommands.length > 0) {
            core.history.push(new BatchCommand(frameCommands));
          }
        },
      },
      {
        label: "Спрятать",
        shortcuts: ["h"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.textEditing) return;
          e.preventDefault();
          const selected = Array.from(
            core.selectManager.selectedNodes.values(),
          );
          const toHide = selected.filter((node) =>
            Boolean(node.list.parentNode),
          );
          if (toHide.length > 0) {
            lastHiddenNodes = toHide;
            toHide.forEach((node) => {
              node.hide(true, true);
            });
          }
        },
      },
      {
        label: "Показать",
        shortcuts: ["ctrl+h"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.textEditing) return;
          Tools.stopEvent(e);
          const selected = Array.from(
            core.selectManager.selectedNodes.values(),
          );
          const toShow = new Set<LNode>();

          const collectHiddenDescendants = (n: LNode) => {
            n.list.children?.forEach((child) => {
              if (child.hiddenBD || child.hidden) {
                toShow.add(child);
              }
              collectHiddenDescendants(child);
            });
          };

          if (selected.length > 0) {
            selected.forEach((node) => {
              if (node.hiddenBD || node.hidden) {
                toShow.add(node);
              }
              collectHiddenDescendants(node);
              if (node.list.parentNode?.list.children) {
                node.list.parentNode.list.children.forEach((sibling) => {
                  if (sibling.hiddenBD || sibling.hidden) {
                    toShow.add(sibling);
                  }
                });
              }
            });
          } else if (
            lastHiddenNodes.length > 0 &&
            lastHiddenNodes.some((n) => n.hiddenBD || n.hidden)
          ) {
            lastHiddenNodes.forEach((node) => {
              if (node.hiddenBD || node.hidden) {
                toShow.add(node);
              }
            });
            lastHiddenNodes = [];
          } else {
            core.nodeManager.nodes.forEach((node) => {
              if (node.hiddenBD || node.hidden) {
                toShow.add(node);
              }
            });
          }

          toShow.forEach((node) => {
            if (node.list.parentNode && !node.list.parentNode.list.isListOpen) {
              node.list.parentNode.list.isListOpen = true;
            }
            node.show(true, true);
          });
        },
      },
      {
        label: "Порядок ступеньками",
        shortcuts: ["alt+q"],
        execute: () => {},
      },
      {
        label: "Порядок в линию друг за другом",
        shortcuts: ["alt+w"],
        execute: () => {},
      },
      {
        label: "Порядок в линию",
        shortcuts: ["alt+e"],
        execute: () => {},
      },
      {
        label: "Отсортировать",
        shortcuts: ["ctrl+1"],
        execute: async () => {},
      },
    ],
  },
  {
    label: "Вид",
    children: [
      {
        label: "Масштаб",
        children: [],
      },
    ],
  },
];
