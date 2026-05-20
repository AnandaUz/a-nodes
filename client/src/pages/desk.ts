import { core } from "@/features/core/core";

export function deskPage(params: Record<string, string>) {
  return {
    html: ``,
    async init() {
      core.init(params);
    },
  };
}
