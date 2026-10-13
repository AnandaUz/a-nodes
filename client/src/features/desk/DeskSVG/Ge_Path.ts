import GElement from "./GElement";

export class Ge_Path extends GElement {
  createElement(): SVGElement {
    return document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    ) as SVGElement;
  }

  constructor() {
    super();
    this.element.setAttribute("stroke", "rgba(255, 171, 16, 0.5)");
    this.element.setAttribute("stroke-width", "2");
    this.element.setAttribute("fill", "none");
  }
  draw(from: { x: number; y: number }, to: { x: number; y: number }) {
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;

    const cx = (x1 + x2) / 2; // контрольные точки посередине

    this.element.setAttribute(
      "d",
      `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
    );
  }
}
