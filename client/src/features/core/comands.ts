import type { UICommand } from "./commands/types";
import { editorCommands } from "./commands/editorCommands";
import { clipboardCommands } from "./commands/clipboardCommands";
import { nodeCreationCommands, nodeActionCommands } from "./commands/nodeCommands";
import { transformCommands } from "./commands/transformCommands";

export type { UICommand };

export const commands: UICommand[] = [
  {
    label: "создание",
    children: [
      ...nodeCreationCommands,
      // Включаем команду Enter как просил пользователь ("чтобы я помнил")
      ...(editorCommands[2] ? [editorCommands[2]] : []),
    ],
  },
  {
    label: "редактирование",
    children: [
      ...nodeActionCommands,
      ...(clipboardCommands[3] ? [clipboardCommands[3]] : []), // создать копию (ctrl+d)
      ...(clipboardCommands[4] ? [clipboardCommands[4]] : []), // создать клона (alt+d)
      { label: "", divider: true },
      ...(editorCommands[0] ? [editorCommands[0]] : []), // Назад
      ...(editorCommands[1] ? [editorCommands[1]] : []), // Вперед
      ...(clipboardCommands[0] ? [clipboardCommands[0]] : []), // Копировать
      ...(clipboardCommands[1] ? [clipboardCommands[1]] : []), // Вырезать
      ...(clipboardCommands[2] ? [clipboardCommands[2]] : []), // Вставить
      { label: "", divider: true },
      ...transformCommands,
    ],
  },
];

function flattenCommands(items: UICommand[]): UICommand[] {
  return items.flatMap((c) => {
    if (c.children && c.children.length > 0) {
      return flattenCommands(c.children);
    }
    return c.execute ? [c] : [];
  });
}

let flatCommands: UICommand[] | null = null;
function getFlatCommands(): UICommand[] {
  if (!flatCommands) {
    flatCommands = flattenCommands(commands);
  }
  return flatCommands;
}

let isCommandsInited = false;

export function initCommands() {
  if (isCommandsInited) return;
  if (typeof window === "undefined") return;
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

    getFlatCommands().find((c) => c.shortcuts?.includes(pressed))?.execute?.(e);
  });
}
