import { core } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
import type { INode } from "@shared/types";
import type VTextEdit from "../nodes/VTextEdit";
import { GRID } from "./CONST";

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
              const vnode = await core.nodeManager.createNode(newNodeEss); //создание текстовой ноды
              if (vnode) {
                const vnode1 = core.nodeRenderer.getVNode(vnode._id || "");
                if (vnode1) {
                  (vnode1 as VTextEdit).turnOn_EditTitleMode();
                }
              }
            },
          },
          {
            label: "страничную ноду",
            shortcuts: ["2"],
            execute: async () => {
              if (core.mode.textEditing) return;
              const { x, y } = core.desk.viewport.screenToWorld(
                core.desk.mouse.x,
                core.desk.mouse.y,
              );
              const newNodeEss: INode = {
                x,
                y,
                type: NODE_TYPES.PAGE.id,
              };
              const vnode = await core.nodeManager.createNode(newNodeEss); //создание текстовой ноды
              if (vnode) {
                const vnode1 = core.nodeRenderer.getVNode(vnode._id || "");
                if (vnode1) {
                  (vnode1 as VTextEdit).turnOn_EditTitleMode();
                }
              }
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
              const vnode = await core.nodeManager.createNode(newNodeEss); //создание ноды менеджер
              if (vnode) {
                const vnode1 = core.nodeRenderer.getVNode(vnode._id || "");
                if (vnode1) {
                  (vnode1 as VTextEdit).turnOn_EditTitleMode();
                }
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
          core.selectManager.selectedNodes.forEach((node) => {
            core.nodeManager.deleteNode(node._id || "");
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
    label: "Трансформации",

    children: [
      {
        label: "Порядок ступеньками",
        shortcuts: ["alt+q"],
        execute: () => {
          if (core.mode.textEditing) return;
          if (core.mode.selectedVNodeCount < 1) return;
          const paddingBottom = 2;
          const paddingLeft = GRID.H;
          const m = [...core.selectManager.selectedNodes.values()];
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const vNode of m) {
            if (y === -1000000) {
              y = vNode.y;
              x = vNode.x;
            } else {
              const xx = Math.round((vNode.x - x) / paddingLeft);
              core.nodeManager.moveToNode(
                vNode.nodeEss,
                x + xx * paddingLeft,
                y,
              );
            }

            y += vNode.body.offsetHeight + paddingBottom;
          }
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
