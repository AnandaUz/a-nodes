import { Viewport } from "./desk.viewport";
import "./desk.scss";

import html from "./desk.html?raw";
// import { core } from "../core/core";

export class Desk {
  nodesEl!: HTMLElement;
  private sceneEl!: HTMLElement;
  viewport!: Viewport;
  mouse = { x: 0, y: 0 };

  constructor() {
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  mount(container: HTMLElement) {
    container.innerHTML = html;

    const viewportEl = container.querySelector<HTMLElement>(".desk-viewport")!;
    // const svgLayerEl = container.querySelector<HTMLElement>('.desk-svg-layer')!;
    this.sceneEl = container.querySelector<HTMLElement>(".desk-scene")!;
    this.nodesEl = container.querySelector<HTMLElement>(".desk-nodes")!;

    this.viewport = new Viewport(viewportEl, this.sceneEl);

    // Новая нода сразу открывается на редактирование
    // this.renderer.onNodeCreated = (_id: string) => {
    //     this.textEditor.startEditing(_id);
    // };

    // Двойной клик по пустому столу — новая нода
    // this.sceneEl.addEventListener("dblclick", async (e) => {

    // });
  }

  unmount() {
    this.viewport?.destroy();
  }
}
