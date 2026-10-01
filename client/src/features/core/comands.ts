import { core } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
// import type { INode } from "@shared/types";
import VTextEdit from "../nodes/VTextEdit";
import { GRID } from "./CONST";
import VFrame from "../nodes/VFrame/VFrame";
import Tools from "./Tools";
import VTextEditClone from "../nodes/VTextEditClone";
import type VFrame_main from "../nodes/VFrame/VFrame_main";

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
          ).sort((a, b) => (a.lNode.y ?? 0) - (b.lNode.y ?? 0));

          // const lNodes = vNodes.map((vNode) => vNode.lNode);

          vNodes.forEach((vNode) => {
            vNode.lNode._id = undefined;
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
          ).sort((a, b) => (a.lNode.y ?? 0) - (b.lNode.y ?? 0));
          core.clipboard.copyVNode(vNodes);
          vNodes.forEach((vNode) => {
            // const vNode = core.nodeRenderer.getVNode(lNode._id || "");
            if (vNode) {
              vNode.body.classList.add("cutted");
            }
            core.nodeManager.putNodeInTrash(vNode.lNode._id || "");
          });
        },
      },
      {
        label: "Вставить",
        shortcuts: ["ctrl+v", "cmd+v"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const lNodes = await core.clipboard.paste();
          if (!lNodes?.nodes) return;

          let x = Infinity,
            y = Infinity;
          lNodes.nodes.forEach((lNode) => {
            if (lNode.x !== undefined) {
              x = Math.min(x, lNode.x);
            }
            if (lNode.y !== undefined) {
              y = Math.min(y, lNode.y);
            }
          });
          const pointerPos = core.desk.viewport.screenToWorld(
            core.desk.pointer.x,
            core.desk.pointer.y,
          );
          core.selectManager.clearSelection();
          lNodes.nodes.forEach(async (lNode) => {
            lNode.pageId = core.mode.deskId;
            lNode.inTrash = false;
            lNode.x = (lNode.x ?? 0) - x + pointerPos.x;
            lNode.y = (lNode.y ?? 0) - y + pointerPos.y;

            const newNodeEss = await core.nodeManager.createNode(lNode);

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
            const newNodeEss = await core.nodeManager.copyNode(vnode.lNode);
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
                core.nodeManager.create_TextEditCloneNode(vnode.lNode),
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
              console.time("createNode");
              core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                NODE_TYPES.TEXT_EDIT.id,
              );
              console.timeEnd("createNode");
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
                core.desk.pointer.x,
                core.desk.pointer.y,
              );
              const newNodeEss: INode = {
                x: Tools.getDiskPosition(x),
                y: Math.round(y),
                type: NODE_TYPES.MANAGER.frame_main,
                exData: {
                  bgColor: Math.round(Math.random() * 360).toString(),
                  hh: 300,
                },
              };
              const vnode = await core.nodeManager.createNode(newNodeEss); //создание ноды менеджер
              if (vnode) {
                const vnode1 = core.nodeRenderer.getVNode(vnode._id || "");
                if (vnode1) {
                  (vnode1 as VTextEdit).turnOn_EditTitleMode();
                }
              }

              const frame = core.nodeRenderer.getVNode(
                vnode?._id || "",
              ) as VFrame_main;
              if (frame) {
                core.frameCore.addFrame(frame);
                core.frameCore.refreshSpatialGrid();

                // this.subFrames.set(frame.lNode._id || "", frame);
                // frame.mainFrames.set(this.lNode._id || "", this);
                // this.refreshHelpersUp();
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
            core.nodeManager.putNodeInTrash(node.lNode._id || "");
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
          core.nodeManager.moveToNode(vnode.lNode, vnode.x + GRID.x, vnode.y);
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
          core.nodeManager.moveToNode(vnode.lNode, vnode.x - GRID.x, vnode.y);
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
            (vnode) => !(vnode instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const vNode of m) {
            if (y === -1000000) {
              y = vNode.lNode.y;
              x = vNode.lNode.x;
            } else {
              const xx = Math.round((vNode.lNode.x - x) / paddingLeft);

              core.nodeManager.moveToNode(vNode.lNode, x + xx * paddingLeft, y);
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
            (vnode) => !(vnode instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = 0,
            y = -1000000;
          for (const vNode of m) {
            if (y === -1000000) {
              y = vNode.lNode.y;
              x = vNode.lNode.x;
            } else {
              core.nodeManager.moveToNode(vNode.lNode, x, y);
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
            (vnode) => !(vnode instanceof VFrame),
          );
          m.sort((a, b) => a.y - b.y);

          let x = -1000000;

          for (const vNode of m) {
            if (x === -1000000) {
              x = vNode.lNode.x;
            } else {
              core.nodeManager.moveToNode(vNode.lNode, x, vNode.lNode.y);
            }
          }
        },
      },
      {
        label: "Отсортировать",
        shortcuts: ["ctrl+1"],
        execute: async () => {
          if (core.mode.textEditing) return;
          if (core.mode.selectedVNodeCount < 1) return;
          const m = [...core.selectManager.selectedNodes.values()].filter(
            (vnode) => !(vnode instanceof VFrame),
          );

          if (m.length < 2) return;
          m.sort((a, b) => a.y - b.y);

          const ss = m.map((vnode, index) => {
            if (vnode instanceof VTextEditClone) {
              return {
                value: vnode.sourceVNode?.lNode.title || "??",
                index,
              };
            } else {
              return {
                value: vnode.lNode.title || "??",
                index,
              };
            }
          });

          const sorted = await core.popupSort.start(ss);

          let y = m[0]?.y || 0;

          // let x = -1000000;

          for (let i = 0; i < sorted.length; i++) {
            const n = sorted[i];
            if (!n) continue;
            const vNode = m[n.index];
            if (!vNode) continue;
            vNode.moveAniTo(vNode.lNode.x, y, i * 50);
            y += vNode.body.offsetHeight;
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
