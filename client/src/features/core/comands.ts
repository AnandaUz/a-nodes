import { core } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
import { GRID } from "./CONST";
import VFrame from "../nodes/VFrame/VFrame";
import Tools from "./Tools";
import type VFrame_main from "../nodes/VFrame/VFrame_main";
import type { LNode } from "../nodes/LNode/LNode";

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
          const nodes = Array.from(
            core.selectManager.selectedNodes.values(),
          ).sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

          nodes.forEach((node) => {
            node._id = undefined;
          });

          core.clipboard.copyVNode(nodes);
        },
      },
      {
        label: "Вырезать",
        shortcuts: ["ctrl+x", "cmd+x"],
        execute: () => {
          if (core.mode.textEditing) return;
          const nodes = Array.from(
            core.selectManager.selectedNodes.values(),
          ).sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
          core.clipboard.copyVNode(nodes);
          nodes.forEach((node) => {
            // const vNode = core.nodeRenderer.getVNode(node._id || "");
            if (node.vNode) {
              node.vNode.body.classList.add("cutted");
            }
            core.nodeManager.putNodeInTrash(node._id || "");
          });
        },
      },
      {
        label: "Вставить",
        shortcuts: ["ctrl+v", "cmd+v"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const nodes = await core.clipboard.paste();
          if (!nodes?.nodes) return;

          let x = Infinity,
            y = Infinity;
          nodes.nodes.forEach((node) => {
            if (node.x !== undefined) {
              x = Math.min(x, node.x);
            }
            if (node.y !== undefined) {
              y = Math.min(y, node.y);
            }
          });
          const pointerPos = core.desk.viewport.screenToWorld(
            core.desk.pointer.x,
            core.desk.pointer.y,
          );
          core.selectManager.clearSelection();
          nodes.nodes.forEach(async (node) => {
            node.pageId = core.mode.deskId;
            node.inTrash = false;
            node.x = (node.x ?? 0) - x + pointerPos.x;
            node.y = (node.y ?? 0) - y + pointerPos.y;

            const newNodeEss = await core.nodeManager.createNode(node);

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
            const newNodeEss = await core.nodeManager.copyNode(vnode.node);
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
          const nodes = Array.from(core.selectManager.selectedNodes.values());

          const newNodes: LNode[] = [];
          nodes.forEach((node) => {
            core.nodeManager.create_TextEditCloneNode(node);
          });

          // const newNodeEsses = (
          //   await Promise.all(
          //     vNodes.map((vnode) =>
          //       core.nodeManager.create_TextEditCloneNode(vnode.node),
          //     ),
          //   )
          // ).filter((n): n is INode => !!n);

          core.selectManager.clearSelection();
          newNodes.forEach((newNode) => {
            core.selectManager.selectNodeById(newNode._id || "", {
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
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);

              // console.time("createNode");
              core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                NODE_TYPES.TEXT_EDIT.id,
              );
              // console.timeEnd("createNode");
            },
          },
          {
            label: "страничную ноду",
            shortcuts: ["2"],
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);
              core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                NODE_TYPES.PAGE.id,
              );
            },
          },
          {
            label: "Менеджер",
            shortcuts: ["3"],
            execute: (e) => {
              //создание ноды менеджер
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);
              const { x, y } = core.desk.viewport.screenToWorld(
                core.desk.pointer.x,
                core.desk.pointer.y,
              );

              const node = core.nodeManager.createNode({
                x: Tools.getDiskPosition(x),
                y: Math.round(y),
                type: NODE_TYPES.FRAME.main,
                exData: {
                  bgColor: Math.round(Math.random() * 360).toString(),
                },
              });
              const vNode = node?.vNode as VFrame_main;
              if (vNode) {
                core.frameCore.addFrame(vNode);
                core.frameCore.refreshSpatialGrid();
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
            core.nodeManager.putNodeInTrash(node._id || "");
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
          const node = core.selectManager.selectedNodes.values().next().value;
          if (!node) return;
          core.nodeManager.moveToNode(node, node.x + GRID.x, node.y);
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
          core.nodeManager.moveToNode(node, node.x - GRID.x, node.y);
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
            (node) => !(node instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const node of m) {
            if (y === -1000000) {
              y = node.y;
              x = node.x;
            } else {
              const xx = Math.round((node.x - x) / paddingLeft);

              core.nodeManager.moveToNode(node, x + xx * paddingLeft, y);
            }

            y += node.vNode?.height || 0;
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
            (node) => !(node instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const node of m) {
            if (y === -1000000) {
              y = node.y;
              x = node.x;
            } else {
              core.nodeManager.moveToNode(node, x, y);
            }

            y += node.vNode?.height || 0;
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
            (node) => !(node instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = -1000000;

          for (const node of m) {
            if (x === -1000000) {
              x = node.x;
            } else {
              core.nodeManager.moveToNode(node, x, node.y);
            }
          }
        },
      },
      {
        label: "Отсортировать",
        shortcuts: ["ctrl+1"],
        execute: async () => {
          // if (core.mode.textEditing) return;
          // if (core.mode.selectedVNodeCount < 1) return;
          // const m = [...core.selectManager.selectedNodes.values()].filter(
          //   (node) => !(node instanceof VFrame),
          // );
          // if (m.length < 2) return;
          // m.sort((a, b) => a.y - b.y);
          // const ss = m.map((node, index) => {
          //   if (node instanceof VTextEditClone) {
          //     return {
          //       value: node.sourceVNode?.node.title || "??",
          //       index,
          //     };
          //   } else {
          //     return {
          //       value: node.title || "??",
          //       index,
          //     };
          //   }
          // });
          // const sorted = await core.popupSort.start(ss);
          // let y = m[0]?.y || 0;
          // // let x = -1000000;
          // for (let i = 0; i < sorted.length; i++) {
          //   const n = sorted[i];
          //   if (!n) continue;
          //   const vNode = m[n.index];
          //   if (!vNode) continue;
          //   vNode.moveAniTo(vNode.node.x, y, i * 50);
          //   y += vNode.body.offsetHeight;
          // }
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
