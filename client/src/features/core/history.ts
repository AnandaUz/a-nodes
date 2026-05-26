import type { Command } from "@features/core/interfaces";

export class History {
  private past: Command[] = [];
  private future: Command[] = [];

  execute(command: Command): void {
    // command.execute();
    this.past.push(command);
    this.future = []; // новое действие сбрасывает future
  }

  undo(): void {
    const command = this.past.pop();
    if (!command) return;
    command.undo();
    this.future.push(command);
  }

  redo(): void {
    const command = this.future.pop();
    if (!command) return;
    command.execute();
    this.past.push(command);
  }
}
