import type { Command } from "@features/core/interfaces";

export class BatchCommand implements Command {
  commands: Command[];

  constructor(commands: Command[]) {
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i]?.undo();
    }
  }
}

export class History {
  private past: Command[] = [];
  private future: Command[] = [];
  private maxSize = 100;

  push(command: Command): void {
    this.past.push(command);
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }
    this.future = [];
  }

  execute(command: Command): void {
    command.execute();
    this.push(command);
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

  clear() {
    this.past = [];
    this.future = [];
  }
}
