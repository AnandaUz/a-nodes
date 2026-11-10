import { core } from "@features/core/core";
import type { UICommand } from "./types";

export const editorCommands: UICommand[] = [
  {
    label: "Назад",
    description: "Отменить последнее действие",
    shortcuts: ["ctrl+z", "cmd+z"],
    execute: () => {
      if (core.mode.textEditing) return;
      core.history.undo();
    },
  },
  {
    label: "Вперед",
    description: "Повторить отмененное действие",
    shortcuts: ["ctrl+shift+z", "cmd+shift+z"],
    execute: () => {
      if (core.mode.textEditing) return;
      core.history.redo();
    },
  },
  {
    label: "Новая нода снизу",
    description: "В режиме редактирования текста создает ноду под текущей",
    shortcuts: ["enter", "num-enter", "numpadenter"],
    when: "editing",
    execute: (e) => {
      if (!core.mode.textEditing) return;

      core.nodeManager.addTextEditNode_byEnter(e as KeyboardEvent);
    },
  },
];
