import { core, EVENTS } from "@features/core/core";
import { NODE_TYPES } from "../nodes/node-registry";
import { GRID } from "./CONST";
import Tools from "./Tools";
import { LNode_TEClone } from "../nodes/LNode/LNode_TEClone";
import { LNode_TextEdit } from "../nodes/LNode/LNode_TextEdit";

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
            core.nodeManager.putNodeInTrash(node);
          });
          core.selectManager.clearSelection();
        },
      },
      {
        label: "Вставить",
        shortcuts: ["ctrl+v", "cmd+v"],
        execute: async () => {
          if (core.mode.textEditing) return;
          const clipboardData = await core.clipboard.paste();
          if (!clipboardData?.nodes || clipboardData.nodes.length === 0) return;

          const rawNodes = clipboardData.nodes;

          // Находим минимальные x, y среди корневых нод (у которых нет родителя в буфере)
          const oldLIDsInBuffer = new Set<number>();
          rawNodes.forEach((n) => {
            if (n.s !== undefined) oldLIDsInBuffer.add(n.s);
          });

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
          const offsetX = pointerPos.x - minX;
          const offsetY = pointerPos.y - minY;

          // Выделяем новые уникальные lID для каждой ноды с lID
          let maxLID = core.nodeManager.getMaxLID();
          const lidMap = new Map<number, number>();
          rawNodes.forEach((n) => {
            if (n.s !== undefined) {
              maxLID++;
              lidMap.set(n.s, maxLID);
            }
          });

          core.selectManager.clearSelection();

          const createdNodes: any[] = [];
          const topLevelNodes: any[] = [];

          // Создаем и гидрируем ноды
          rawNodes.forEach((nodeData) => {
            const node = core.nodeManager.addNode(nodeData.type || 0);

            // Распаковываем базовые данные
            node.title = nodeData.title;
            node.type = nodeData.type ?? 0;
            node.pageId = core.mode.deskId;
            node.inTrash = false;
            node.hiddenBD = false;
            node.hidden = false;

            // Смещаем позицию
            const originalX = nodeData.x ?? 0;
            const originalY = nodeData.y ?? 0;
            node.x = Tools.getDiskPosition(originalX + offsetX);
            node.y = Math.round(originalY + offsetY);

            // Переназначаем собственный lID
            if (nodeData.s !== undefined && lidMap.has(nodeData.s)) {
              node.lID = lidMap.get(nodeData.s);
            }

            // Распаковываем list / parentLID
            if (nodeData.L !== undefined) {
              const tab = nodeData.L & 0b111;
              const index = (nodeData.L >> 3) & 0b111111111111;
              const oldParentLID = (nodeData.L >> 15) & 0b11111111111111111;

              node.list.tab = tab;
              node.list.index = index;

              if (oldParentLID && lidMap.has(oldParentLID)) {
                node.list.parentLID = lidMap.get(oldParentLID);
              } else {
                node.list.parentLID = undefined;
              }
            }

            // Распаковываем клоны (mainNodeLID)
            if (nodeData.A !== undefined) {
              const oldMainLID = nodeData.A & 0b11111111111111111;
              if (oldMainLID && lidMap.has(oldMainLID)) {
                node.clones.mainNodeLID = lidMap.get(oldMainLID)!;
              } else if (oldMainLID) {
                // Если исходная нода осталась на доске снаружи буфера
                node.clones.mainNodeLID = oldMainLID;
              }
            }

            // exData
            if (nodeData.exData) {
              node.exData = structuredClone(nodeData.exData);
            }

            // Добавляем в NodeManager синхронно сразу, чтобы getNodeByLID находил ноды
            core.nodeManager.nodes.add(node);

            // Сохраняем на сервере
            core.serverPersistence.createNode(node, (id: string) => {
              node._id = id;
            });
            core.store.emit(EVENTS.node.created, node);

            createdNodes.push(node);

            // Считаем ноду верхнеуровневой, если у нее нет родителя в созданной группе
            if (!node.list.parentLID) {
              topLevelNodes.push(node);
            }
          });

          // Инициализируем родительские связи внутри дерева
          createdNodes.forEach((node) => {
            if (node.list.parentLID) {
              const parentNode = core.nodeManager.getNodeByLID(node.list.parentLID);
              if (parentNode) {
                if (!parentNode.list.children) {
                  parentNode.list.children = new Set();
                }
                parentNode.list.children.add(node);
                node.list.parentNode = parentNode;
              }
            }
          });

          // Инициализируем связи клонов
          core.nodeManager.initCloneLinks();

          // Рендерим VNode для всех созданных нод
          createdNodes.forEach((node) => {
            core.nodeRenderer.createVNode(node);
          });

          // Выстраиваем правильные координаты и SVG-линии для всех корневых деревьев
          const updatedRoots = new Set<any>();
          createdNodes.forEach((node) => {
            const root = node.list.mainParent || node;
            if (!updatedRoots.has(root)) {
              updatedRoots.add(root);
              root.list.setPositionForChildren();
              root.list.checkTree();
              root.vNode?.renderSVG();
              root.save();
            }
          });

          // Выделяем все вставленные ноды
          createdNodes.forEach((node) => {
            core.selectManager.selectNode(node, { ctrlKey: true });
          });
        },
      },
      {
        label: "создать копию",
        shortcuts: ["ctrl+d", "cmd+d"],
        execute: async (_e) => {
          // Tools.stopEvent(e);
          // const vNodes = Array.from(core.selectManager.selectedNodes.values());
          // const newNodeEsses: INode[] = [];
          // for (const vnode of vNodes) {
          //   const newNodeEss = await core.nodeManager.copyNode(vnode.node);
          //   if (newNodeEss) newNodeEsses.push(newNodeEss);
          // }
          // core.selectManager.clearSelection();
          // newNodeEsses.forEach((newNodeEss) => {
          //   core.selectManager.selectNode(newNodeEss, { ctrlKey: true });
          // });
          // core.selectManager.transformMove.start();
        },
      },
      {
        label: "создать клона",
        shortcuts: ["alt+d"],
        execute: async (e) => {
          Tools.stopEvent(e);
          const nodes = Array.from(core.selectManager.selectedNodes.values());

          const newNodes: LNode_TEClone[] = [];
          nodes.forEach((node) => {
            if (!(node instanceof LNode_TextEdit)) return;

            const nNode = core.nodeManager.create_TextEditCloneNode(
              node,
              node.x,
              node.y,
            );
            if (nNode && nNode instanceof LNode_TEClone) {
              newNodes.push(nNode);
            }
          });

          core.selectManager.clearSelection();
          newNodes.forEach((newNode) => {
            core.selectManager.selectNode(newNode, {
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
            label: "Фрейм",
            shortcuts: ["3"],
            execute: (e) => {
              if (core.mode.textEditing) return;
              Tools.stopEvent(e);
              const node =
                core.nodeManager.createNodeWithTypeAndPositionFromCursor(
                  NODE_TYPES.TEXT_EDIT.id,
                );
              if (node instanceof LNode_TextEdit) {
                node.frame.turnOn_frameMode();
                node.save();
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
            core.nodeManager.putNodeInTrash(node);
          });
        },
      },
      {
        label: "удалить c клонами",
        shortcuts: ["shift+x", "shift+delete"],
        execute: async () => {
          if (core.mode.textEditing) return;
          core.selectManager.selectedNodes.forEach((node) => {
            core.nodeManager.putNodeInTrash(node, true);
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
          node.moveTo({ x: node.x + GRID.x, y: node.y });
          const mainList = node.list.mainParent?.list;
          if (mainList) {
            mainList.checkTree();
            mainList.setPositionForChildren();
          }
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
          node.moveTo({ x: node.x - GRID.x, y: node.y });
          const mainList = node.list.mainParent?.list;
          if (mainList) {
            mainList.checkTree();
            mainList.setPositionForChildren();
          }
        },
      },
      {
        label: "Включить выключить режим фрейма",
        shortcuts: ["f"],
        execute: (e: KeyboardEvent) => {
          if (core.mode.textEditing) return;
          e.preventDefault();
          core.selectManager.selectedNodes.forEach((node) => {
            if (!(node instanceof LNode_TextEdit)) return;
            if (!node.frame.isFrame) {
              node.frame.turnOn_frameMode();
            } else {
              node.frame.turnOff_frameMode();
            }

            node.save();
            node.vNode?.render();
          });
        },
      },
      {
        label: "Порядок ступеньками",
        shortcuts: ["alt+q"],
        execute: () => {
          // if (core.mode.textEditing) return;
          // if (core.mode.selectedVNodeCount < 1) return;
          // const paddingLeft = GRID.x;
          // const m = [...core.selectManager.selectedNodes.values()].filter(
          //   (node) => !(node instanceof VFrame),
          // );
          // m.sort((a, b) => a.y - b.y);
          // let x = 0,
          //   y = -1000000;
          // for (const node of m) {
          //   if (y === -1000000) {
          //     y = node.y;
          //     x = node.x;
          //   } else {
          //     const xx = Math.round((node.x - x) / paddingLeft);
          //     ///core.nodeManager.moveToNode(node, x + xx * paddingLeft, y);
          //   }
          //   y += node.vNode?.height || 0;
          // }
        },
      },
      {
        label: "Порядок в линию друг за другом",
        shortcuts: ["alt+w"],
        execute: () => {
          // if (core.mode.textEditing) return;
          // if (core.mode.selectedVNodeCount < 1) return;
          // const m = [...core.selectManager.selectedNodes.values()].filter(
          //   (node) => !(node instanceof VFrame),
          // );
          // m.sort((a, b) => a.y - b.y);
          // let x = 0,
          //   y = -1000000;
          // for (const node of m) {
          //   if (y === -1000000) {
          //     y = node.y;
          //     x = node.x;
          //   } else {
          //     ///core.nodeManager.moveToNode(node, x, y);
          //   }
          //   y += node.vNode?.height || 0;
          // }
        },
      },
      {
        label: "Порядок в линию",
        shortcuts: ["alt+e"],
        execute: () => {
          //     if (core.mode.textEditing) return;
          //     if (core.mode.selectedVNodeCount < 1) return;
          //     const m = [...core.selectManager.selectedNodes.values()].filter(
          //       (node) => !(node instanceof VFrame),
          //     );
          //     m.sort((a, b) => a.y - b.y);
          //     let x = -1000000;
          //     for (const node of m) {
          //       if (x === -1000000) {
          //         x = node.x;
          //       } else {
          //         ///core.nodeManager.moveToNode(node, x, node.y);
          //       }
          //     }
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
