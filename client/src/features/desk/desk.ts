import { Viewport } from "./desk.viewport";
import "./desk.scss";
import "@components/c-nodes-menu/c-nodes-menu";

import html from "./desk.html?raw";
import { EVENTS } from "../core/store";
import { core } from "../core/core";

export class Desk {
  nodesEl!: HTMLElement;
  private sceneEl!: HTMLElement;
  private h1El!: HTMLHeadingElement;
  viewport!: Viewport;
  mouse = { x: 0, y: 0 };
  private faviconCanvas = document.createElement("canvas");

  constructor() {
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    core.store.on(EVENTS.NodeManager.reInitAllNodes, () => {
      const title = core.nodeManager.pageNode?.title || "a-nodes";
      this.h1El.innerHTML = title;

      const chars = [...title];
      const firstChar = chars[0] || "";
      const hasEmoji = /^\p{Emoji}/u.test(firstChar);
      const titleWithoutEmoji = hasEmoji
        ? chars.slice(firstChar.length).join("")
        : title;

      document.title = titleWithoutEmoji;

      this.setEmojiFavicon(hasEmoji ? firstChar : "🔥");
    });
  }

  mount(container: HTMLElement) {
    container.innerHTML = html;
    this.h1El = document.querySelector("h1")!;

    const viewportEl = container.querySelector<HTMLElement>(".desk-viewport")!;
    // const svgLayerEl = container.querySelector<HTMLElement>('.desk-svg-layer')!;
    this.sceneEl = container.querySelector<HTMLElement>(".desk-scene")!;
    this.nodesEl = container.querySelector<HTMLElement>(".desk-nodes")!;
    this.viewport = new Viewport(viewportEl, this.sceneEl);
  }

  unmount() {
    this.viewport?.destroy();
  }
  setEmojiFavicon(emoji: string) {
    const w = 64;
    this.faviconCanvas.width = w;
    this.faviconCanvas.height = w;

    const ctx = this.faviconCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, w);
    ctx.font = "54px Apple Color Emoji, Segoe UI Emoji, serif";
    ctx.fillText(emoji, 0, 52);

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = this.faviconCanvas.toDataURL();
  }
}
