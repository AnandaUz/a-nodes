import { core } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
import type { INode } from "@shared/types";
import type VTextEdit from "../nodes/VTextEdit";
import { GRID } from "./CONST";
import VM_area from "../nodes/VManager/VM_area";
import Tools from "./Tools";

interface Command {
  label: string;
  shortcuts?: string[];
  execute?: (e: KeyboardEvent) => void;
  children?: Command[];
}
const commands: Command[] = [
  {
    label: "Редактор",
    children: [
      {
        label: "Назад",
        shortcuts: ["ctrl+z", "cmd+z"],
        execute: () => {
          if (core.mode.textEditing) return;
          core.history.undo();
        },
      },
      {
        label: "Вперед",
        shortcuts: ["ctrl+shift+z", "cmd+shift+z"],
        execute: () => {
          if (core.mode.textEditing) return;
          core.history.redo();
        },
      },
      {
        label: "Enter",
        shortcuts: ["enter", "num-enter"],
        execute: (e: KeyboardEvent) => {
          if (!core.mode.textEditing) return;
          core.nodeManager.addTextEditNode_byEnter(e);
        },
      },
      {
        label: "Копировать",
        shortcuts: ["ctrl+c", "cmd+c"],
        execute: () => {
          if (core.mode.textEditing) return;
          const vNodes = Array.from(
            core.selectManager.selectedNodes.values(),
          ).sort((a: INode, b: INode) => (a.y ?? 0) - (b.y ?? 0));

          // const nodeEsses = vNodes.map((vNode) => vNode.nodeEss);

          vNodes.forEach((vNode) => {
            delete vNode.nodeEss._id;
          });

          core.clipboard.copyVNode(vNodes);
        },
      },
      {
        label: "Вырезать",
        shortcuts: ["ctrl+x", "cmd+x"],
        execute: () => {
          if (core.mode.textEditing) return;
          const vNodes = Array.from(
            core.selectManager.selectedNodes.values(),
          ).sort((a: INode, b: INode) => (a.y ?? 0) - (b.y ?? 0));
          core.clipboard.copyVNode(vNodes);
          vNodes.forEach((vNode) => {
            // const vNode = core.nodeRenderer.getVNode(nodeEss._id || "");
            if (vNode) {
              vNode.body.classList.add("cutted");
            }
            core.nodeManager.putInTrashNode(vNode.nodeEss._id || "");
          });
        },
      },
      {
        label: "Вставить",
        shortcuts: ["ctrl+v", "cmd+v"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const nodeEsses = await core.clipboard.paste();
          if (!nodeEsses?.nodes) return;

          let x = Infinity,
            y = Infinity;
          nodeEsses.nodes.forEach((nodeEss) => {
            if (nodeEss.x !== undefined) {
              x = Math.min(x, nodeEss.x);
            }
            if (nodeEss.y !== undefined) {
              y = Math.min(y, nodeEss.y);
            }
          });
          const mousePos = core.desk.viewport.screenToWorld(
            core.desk.mouse.x,
            core.desk.mouse.y,
          );
          core.selectManager.clearSelection();
          nodeEsses.nodes.forEach(async (nodeEss) => {
            nodeEss.pageId = core.mode.deskId;
            nodeEss.inTrash = false;
            nodeEss.x = (nodeEss.x ?? 0) - x + mousePos.x;
            nodeEss.y = (nodeEss.y ?? 0) - y + mousePos.y;

            const newNodeEss = await core.nodeManager.createNode(nodeEss);

            if (newNodeEss) {
              core.selectManager.selectNodeById(newNodeEss._id || "", {
                ctrlKey: true,
              });
            }
          });
        },
      },
      {
        label: "создать копию",
        shortcuts: ["ctrl+d", "cmd+d"],
        execute: async (e) => {
          Tools.stopEvent(e);
          const vNodes = Array.from(core.selectManager.selectedNodes.values());

          const newNodeEsses: INode[] = [];
          for (const vnode of vNodes) {
            const newNodeEss = await core.nodeManager.copyNode(vnode.nodeEss);
            if (newNodeEss) newNodeEsses.push(newNodeEss);
          }

          core.selectManager.clearSelection();
          newNodeEsses.forEach((newNodeEss) => {
            core.selectManager.selectNodeById(newNodeEss._id || "", {
              ctrlKey: true,
            });
          });
          core.selectManager.transformMove.start();
        },
      },
      {
        label: "создать клона",
        shortcuts: ["alt+d"],
        execute: async (e) => {
          Tools.stopEvent(e);
          const vNodes = Array.from(core.selectManager.selectedNodes.values());

          const newNodeEsses = (
            await Promise.all(
              vNodes.map((vnode) =>
                core.nodeManager.create_TextEditCloneNode(vnode.nodeEss),
              ),
            )
          ).filter((n): n is INode => !!n);

          core.selectManager.clearSelection();
          newNodeEsses.forEach((newNodeEss) => {
            core.selectManager.selectNodeById(newNodeEss._id || "", {
              ctrlKey: true,
            });
          });
          core.selectManager.transformMove.start();
        },
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
              core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                NODE_TYPES.TEXT_EDIT.id,
              );
            },
          },
          {
            label: "страничную ноду",
            shortcuts: ["2"],
            execute: async () => {
              if (core.mode.textEditing) return;
              core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                NODE_TYPES.PAGE.id,
              );
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
            core.nodeManager.putInTrashNode(node._id || "");
          });
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
  {
    label: "Трансформации",

    children: [
      {
        label: "Сдвиг по Tab",
        shortcuts: ["tab"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.selectedVNodeCount !== 1) return;
          e.preventDefault();
          const vnode = core.selectManager.selectedNodes.values().next().value;
          if (!vnode) return;
          core.nodeManager.moveToNode(vnode.nodeEss, vnode.x + GRID.x, vnode.y);
        },
      },
      {
        label: "Обратный сдвиг по Tab",
        shortcuts: ["shift+tab"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.selectedVNodeCount !== 1) return;
          e.preventDefault();
          const vnode = core.selectManager.selectedNodes.values().next().value;
          if (!vnode) return;
          core.nodeManager.moveToNode(vnode.nodeEss, vnode.x - GRID.x, vnode.y);
        },
      },
      {
        label: "Порядок ступеньками",
        shortcuts: ["alt+q"],
        execute: () => {
          if (core.mode.textEditing) return;
          if (core.mode.selectedVNodeCount < 1) return;
          const paddingLeft = GRID.x;
          const m = [...core.selectManager.selectedNodes.values()].filter(
            (vnode) => !(vnode instanceof VM_area),
          );
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

            y += vNode.body.offsetHeight;
          }
        },
      },
      {
        label: "Порядок в линию друг за другом",
        shortcuts: ["alt+w"],
        execute: () => {
          if (core.mode.textEditing) return;
          if (core.mode.selectedVNodeCount < 1) return;
          const m = [...core.selectManager.selectedNodes.values()].filter(
            (vnode) => !(vnode instanceof VM_area),
          );
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const vNode of m) {
            if (y === -1000000) {
              y = vNode.y;
              x = vNode.x;
            } else {
              core.nodeManager.moveToNode(vNode.nodeEss, x, y);
            }

            y += vNode.body.offsetHeight;
          }
        },
      },
      {
        label: "Порядок в линию",
        shortcuts: ["alt+e"],
        execute: () => {
          if (core.mode.textEditing) return;
          if (core.mode.selectedVNodeCount < 1) return;
          const m = [...core.selectManager.selectedNodes.values()].filter(
            (vnode) => !(vnode instanceof VM_area),
          );
          m.sort((a, b) => a.y - b.y);

          let x = -1000000;

          for (const vNode of m) {
            if (x === -1000000) {
              x = vNode.x;
            } else {
              core.nodeManager.moveToNode(vNode.nodeEss, x, vNode.y);
            }
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

    flatCommands.find((c) => c.shortcuts?.includes(pressed))?.execute?.(e);
  });
}
