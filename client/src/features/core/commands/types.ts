export interface UICommand {
  label: string;
  shortcuts?: string[];
  execute?: (e: KeyboardEvent) => void | Promise<void>;
  children?: UICommand[];
}
