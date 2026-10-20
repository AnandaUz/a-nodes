import GElement from "./GElement";

export class Ge_Path extends GElement {
  /** какая связь фреймов нарисована этим путём */
  link?: { child: unknown; parent: unknown };
  /** невидимый толстый путь для удобного клика */
  hit: SVGPathElement;
  /** кружок на конце у родителя */
  dot: SVGCircleElement;
  private baseStroke = "rgba(255, 171, 16, 0.5)";

  createElement(): SVGElement {
    return document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    ) as SVGElement;
  }

  constructor() {
    super();
    this.element.setAttribute("stroke", this.baseStroke);
    this.element.setAttribute("stroke-width", "2");
    this.element.setAttribute("fill", "none");
    this.element.style.pointerEvents = "none";

    this.hit = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    ) as SVGPathElement;
    this.hit.setAttribute("stroke", "transparent");
    this.hit.setAttribute("stroke-width", "14");
    this.hit.setAttribute("fill", "none");
    this.hit.style.pointerEvents = "none";
    this.element.after(this.hit);

    this.dot = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    ) as SVGCircleElement;
    this.dot.setAttribute("r", "4");
    this.dot.setAttribute("fill", "#ff8a3d");
    this.dot.style.pointerEvents = "none";
    this.hit.after(this.dot);
  }
  /** включает реакцию на клик (для постоянных связей) */
  enableSelect(onSelect: (p: Ge_Path) => void) {
    this.hit.style.pointerEvents = "stroke";
    this.hit.style.cursor = "pointer";
    this.hit.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(this);
    });
  }
  select() {
    this.element.setAttribute("stroke", "rgba(255, 120, 0, 1)");
    this.element.setAttribute("stroke-width", "3.5");
  }
  unselect() {
    this.element.setAttribute("stroke", this.baseStroke);
    this.element.setAttribute("stroke-width", "2");
  }
  draw(from: { x: number; y: number }, to: { x: number; y: number }) {
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;

    const cx = (x1 + x2) / 2; // контрольные точки посередине
    const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;

    this.element.setAttribute("d", d);
    this.hit.setAttribute("d", d);
    this.dot.setAttribute("cx", x1.toString());
    this.dot.setAttribute("cy", y1.toString());
  }
  setDotVisible(v: boolean) {
    this.dot.style.display = v ? "" : "none";
  }
  remove() {
    this.hit.remove();
    this.dot.remove();
    super.remove();
  }
}
