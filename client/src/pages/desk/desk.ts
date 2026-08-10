import { core } from "@/features/core/core";
import "@components/c-mobi-submenu/c-mobi-submenu";
import "./desk.scss";
import html from "./desk.html?raw";

export function deskPage(params: Record<string, string>) {
  return {
    html: html,
    async init() {
      await core.init(params);
    },
    unmount() {
      core.unmount();
    },
  };
}
