import { core } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
import type { INode } from "@shared/types";

interface Command {
  label: string;
  shortcuts?: string[];
  execute?: () => void;
  children?: Command[];
}
const commands: Command[] = [
  {
    label: "Редактор",
    children: [
      {
        label: "Назад",
        shortcuts: ["ctrl+z", "cmd+z"],
        execute: () => core.history.undo(),
      },
      {
        label: "Вперед",
        shortcuts: ["ctrl+shift+z", "cmd+shift+z"],
        execute: () => core.history.redo(),
      },
    ],
  },
  {
    label: "Нода",
    children: [
      {
        label: "Создать",
        children: [
          {
            label: "Текстовую ноду",
            shortcuts: ["1"],
            execute: async () => {
              if (core.mode.textEditing) return;
              const { x, y } = core.desk.viewport.screenToWorld(
                core.desk.mouse.x,
                core.desk.mouse.y,
              );
              const newNodeEss: INode = {
                x,
                y,
                type: NODE_TYPES.TEXT_EDIT.id,
                exData: {},
              };
              await core.nodeManager.createNode(newNodeEss); //создание текстовой ноды
            },
          },
          {
            label: "Менеджер",
            shortcuts: ["3"],
            execute: async () => {
              if (core.mode.textEditing) return;
              const { x, y } = core.desk.viewport.screenToWorld(
                core.desk.mouse.x,
                core.desk.mouse.y,
              );
              const newNodeEss: INode = {
                x,
                y,
                type: NODE_TYPES.MANAGER.area_main,
                exData: {},
              };
              await core.nodeManager.createNode(newNodeEss); //создание ноды менеджер
            },
          },
        ],
      },
      {
        label: "удалить",
        shortcuts: ["x", "delete"],
        execute: async () => {
          if (core.mode.textEditing) return;
          core.selectManager.selectedNodes.forEach((node) => {
            node.delete();
          });
        },
      },
      // {
      //   label: "Дублировать",
      //   shortcuts: ["ctrl+d"],
      //   execute: () => nodeStore.duplicate(),
      // },
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
  {
    label: "Вид",
    children: [
      {
        label: "Масштаб",
        children: [
          // { label: "Увеличить", shortcut: "ctrl+=", execute: () => zoom.in() },
          // { label: "Уменьшить", shortcut: "ctrl+-", execute: () => zoom.out() },
        ],
      },
    ],
  },
];

function flattenCommands(commands: Command[]): Command[] {
  return commands.flatMap((c) =>
    c.children ? flattenCommands(c.children) : c,
  );
}

const flatCommands = flattenCommands(commands);

export function initCommands() {
  window.addEventListener("keydown", (e) => {
    const key = e.code
      .replace("Key", "") // "KeyN" → "N"
      .replace("Digit", "") // "Digit1" → "1"
      .toLowerCase();

    const pressed = [
      e.ctrlKey && "ctrl",
      e.altKey && "alt",
      e.shiftKey && "shift",
      key,
    ]
      .filter(Boolean)
      .join("+");

    flatCommands.find((c) => c.shortcuts?.includes(pressed))?.execute?.();
  });
}
