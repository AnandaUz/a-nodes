import { core } from "@features/core/core";
import type { UICommand } from "./types";

export const editorCommands: UICommand[] = [
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
];
