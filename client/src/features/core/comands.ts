import type { UICommand } from "./commands/types";
import { editorCommands } from "./commands/editorCommands";
import { clipboardCommands } from "./commands/clipboardCommands";
import { nodeCommands } from "./commands/nodeCommands";
import { transformCommands } from "./commands/transformCommands";

export type { UICommand };

const commands: UICommand[] = [
  {
    label: "Редактор",
    children: [...editorCommands, ...clipboardCommands],
  },
  ...nodeCommands,
  ...transformCommands,
];

function flattenCommands(commands: UICommand[]): UICommand[] {
  return commands.flatMap((c) =>
    c.children ? flattenCommands(c.children) : c,
  );
}

const flatCommands = flattenCommands(commands);

let isCommandsInited = false;

export function initCommands() {
  if (isCommandsInited) return;
  isCommandsInited = true;

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
