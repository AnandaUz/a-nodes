import { core } from "@/features/core/core";

export default class GElement {
  element: SVGElement;

  constructor() {
    this.element = this.createElement();
    core.desk.svgLayer.svg.appendChild(this.element);
  }
  createElement(): SVGElement {
    return document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    ) as SVGElement;
  }
  reDraw() {}
  remove() {
    this.element.remove();
  }
}
