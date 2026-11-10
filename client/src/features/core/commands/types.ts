export type CommandContext = "canvas" | "editing" | "always";

export interface UICommand {
  label: string;
  description?: string;
  shortcuts?: string[];
  execute?: (e?: any) => void | Promise<void>;
  children?: UICommand[];
  divider?: boolean;
  when?: CommandContext;
}
