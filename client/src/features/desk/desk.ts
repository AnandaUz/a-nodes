import { Viewport } from "./desk.viewport";
import "./desk.scss";
import "@components/c-nodes-menu/c-nodes-menu";
import "@components/c-mobi-submenu/c-mobi-submenu";

import html from "./desk.html?raw";
import { EVENTS } from "../core/store";
import { core } from "../core/core";
import { DeskSVG } from "./DeskSVG/DeskSVG";
import type { Ge_Path } from "./DeskSVG/Ge_Path";
import { FrameLinkDrag } from "./FrameLinkDrag";
import type { LNode_TextEdit } from "../nodes/LNode/LNode_TextEdit";

export class Desk {
  nodesEl!: HTMLElement;
  private nodesElData: {
    parent: HTMLElement;
    nextSibling: HTMLElement;
  } | null = null;

  private sceneEl!: HTMLElement;
  private h1El!: HTMLHeadingElement;
  viewport!: Viewport;
  svgLayer!: DeskSVG;
  pointer = { x: 0, y: 0 };
  linkDrag = new FrameLinkDrag();
  selectedPath: Ge_Path | null = null;
  private faviconCanvas = document.createElement("canvas");

  constructor() {
    window.addEventListener("pointermove", (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    });

    // удаление выделенной связи фреймов (capture — раньше других хоткеев)
    window.addEventListener(
      "keydown",
      (e) => {
        if (!this.selectedPath) return;
        const t = document.activeElement as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable)
        )
          return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.code === "KeyX" || e.code === "Delete") {
          const link = this.selectedPath.link as
            | { child: LNode_TextEdit; parent: LNode_TextEdit }
            | undefined;
          this.selectedPath = null;
          if (link) link.child.frame.unlinkFromParent(link.parent);
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    // клик по пустому месту снимает выделение связи
    window.addEventListener("pointerdown", () => this.selectPath(null), true);

    core.store.on(EVENTS.NodeManager.reInitAlnodes, () => {
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
  selectPath(p: Ge_Path | null) {
    if (this.selectedPath === p) return;
    this.selectedPath?.unselect();
    this.selectedPath = p;
    p?.select();
  }
  /** выключает из ДОМ елемент в котором все ноды (чтобы прорисовывать за раз) */
  disconnectNodesEl() {
    const nodesEl = this.nodesEl;
    const parent = nodesEl.parentNode as HTMLElement;
    const nextSibling = nodesEl.nextSibling as HTMLElement;
    parent.removeChild(nodesEl); // отсоединили

    this.nodesElData = {
      parent,
      nextSibling,
    };
  }
  /** включает в ДОМ елемент в котором все ноды */
  connectNodesEl() {
    if (!this.nodesElData) return;
    this.nodesElData.parent.insertBefore(
      this.nodesEl,
      this.nodesElData.nextSibling,
    ); // вернули — один reflow
  }

  mount(container: HTMLElement) {
    container.innerHTML = html;
    this.h1El = document.querySelector("h1")!;

    const viewportEl = container.querySelector<HTMLElement>(".desk-viewport")!;
    // const svgLayerEl = container.querySelector<HTMLElement>('.desk-svg-layer')!;
    this.sceneEl = container.querySelector<HTMLElement>(".desk-scene")!;
    this.nodesEl = container.querySelector<HTMLElement>(".desk-nodes")!;
    this.viewport = new Viewport(viewportEl, this.sceneEl);

    const svgLayerEl = container.querySelector<HTMLElement>(".desk-svg-layer")!;
    this.svgLayer = new DeskSVG(svgLayerEl);
  }

  unmount() {
    this.svgLayer.destroy();
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
