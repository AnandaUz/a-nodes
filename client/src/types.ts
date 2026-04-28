export type Page = (params: Record<string, string>) => {
  html: string;
  title?: string;
  init?: () => void;
};

export type Routes = Record<string, Page>;