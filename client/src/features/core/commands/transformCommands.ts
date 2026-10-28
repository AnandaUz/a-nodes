import { core } from "@features/core/core";
import { GRID } from "../CONST";
import { BatchCommand } from "../history";
import type { Command as IHistoryCommand } from "../interfaces";
import type { UICommand } from "./types";

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
          const selected = Array.from(core.selectManager.selectedNodes.values());
          selected.forEach((node) => {
            if (node.list.parentNode) {
              node.hide(true, true);
            }
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
