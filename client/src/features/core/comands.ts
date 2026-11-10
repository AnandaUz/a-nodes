import type { UICommand } from "./commands/types";
import { core } from "./core";
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

let shortcutMap: Map<string, UICommand> | null = null;
function getShortcutMap(): Map<string, UICommand> {
  if (!shortcutMap) {
    shortcutMap = new Map();
    for (const cmd of getFlatCommands()) {
      if (!cmd.shortcuts) continue;
      for (const sc of cmd.shortcuts) {
        const normalized = sc.toLowerCase().replace(/\bcmd\+/g, "ctrl+");
        shortcutMap.set(normalized, cmd);
      }
    }
  }
  return shortcutMap;
}

let isCommandsInited = false;
let commandsAbortController: AbortController | null = null;

export function resetCommands(): void {
  if (commandsAbortController) {
    commandsAbortController.abort();
    commandsAbortController = null;
  }
  isCommandsInited = false;
  shortcutMap = null;
  flatCommands = null;
}

export function initCommands(signal?: AbortSignal): () => void {
  if (isCommandsInited) return () => resetCommands();
  if (typeof window === "undefined") return () => {};
  isCommandsInited = true;

  commandsAbortController = new AbortController();
  const activeSignal = signal || commandsAbortController.signal;

  activeSignal.addEventListener("abort", () => {
    isCommandsInited = false;
  });

  const map = getShortcutMap();

  window.addEventListener(
    "keydown",
    (e) => {
      const key = e.code
        .replace("Key", "") // "KeyN" → "N"
        .replace("Digit", "") // "Digit1" → "1"
        .toLowerCase();

      const isCtrlOrMeta = Boolean(e.ctrlKey || e.metaKey);
      const pressed = [
        isCtrlOrMeta && "ctrl",
        e.altKey && "alt",
        e.shiftKey && "shift",
        key,
      ]
        .filter(Boolean)
        .join("+");

      const cmd = map.get(pressed);
      if (!cmd || !cmd.execute) return;

      const when = cmd.when || "canvas";
      if (when !== "always") {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInputFocused = Boolean(
          activeEl &&
            (activeEl.tagName === "INPUT" ||
              activeEl.tagName === "TEXTAREA" ||
              activeEl.isContentEditable),
        );
        const isEditing = Boolean(core.mode.textEditing || isInputFocused);

        if (when === "canvas" && isEditing) return;
        if (when === "editing" && !isEditing) return;
      }

      cmd.execute(e);
    },
    { signal: activeSignal },
  );

  return () => resetCommands();
}
