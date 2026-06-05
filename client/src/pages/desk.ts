import { core } from "@/features/core/core";

export function deskPage(params: Record<string, string>) {
  return {
    html: ``,
    async init() {
      await core.init(params);
    },
    unmount() {
      core.unmount();
    },
  };
}
