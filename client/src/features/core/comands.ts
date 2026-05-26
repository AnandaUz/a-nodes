import { core } from "@features/core/core";

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
        label: "Создать текстовую ноду",
        shortcuts: ["1"],
        execute: async () => {
          const { x, y } = core.desk.viewport.screenToWorld(core.desk.mouse.x, core.desk.mouse.y);
          await core.nodeManager.createNode(1, x, y); //создание текстовой ноды
        },
      },
      {
        label: "Дублировать",
        shortcuts: ["ctrl+d"],
        execute: () => nodeStore.duplicate(),
      },
      {
        label: "Удалить",
        shortcuts: ["x"],
        execute: () => {
          console.log("delete");
        },
      },
      {
        label: "Двигать ноду(ы)",
        shortcuts: ["g"],
        execute: () => {
          console.log("move");

          core.selectManager.transformMove.start()
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
          { label: "Увеличить", shortcut: "ctrl+=", execute: () => zoom.in() },
          { label: "Уменьшить", shortcut: "ctrl+-", execute: () => zoom.out() },
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
