export class DeskSVG {
  private svg: SVGElement;
  private bgLayer: SVGGElement;
  private arrowLayer: SVGGElement;

  constructor(container: HTMLElement) {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("desk-svg-layer");
    this.svg.style.cssText = "position:absolute;top:0;left:0;overflow:visible;";

    this.bgLayer = this.createGroup("bg-layer");
    this.arrowLayer = this.createGroup("arrow-layer");

    this.svg.append(this.bgLayer, this.arrowLayer);
    container.prepend(this.svg); // под нодами
  }

  private createGroup(cls: string): SVGGElement {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add(cls);
    return g;
  }
  /** рисуем простой прямогуольник, со скругленными углами с заданым цветом */
  drawRect(x: number, y: number, w: number, h: number, color: string) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", w.toString());
    rect.setAttribute("height", h.toString());
    rect.setAttribute("rx", "5");
    rect.setAttribute("ry", "5");
    rect.setAttribute("fill", color);
    this.bgLayer.appendChild(rect);
    return rect;
  }

  // рисует фон под блоком
  drawBlockBg(
    x: number,
    y: number,
    w: number,
    h: number,
    images: { top: string; main: string; bottom: string },
  ) {
    const foreignObject = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "foreignObject",
    );
    foreignObject.setAttribute("x", x.toString());
    foreignObject.setAttribute("y", y.toString());
    foreignObject.setAttribute("width", w.toString());
    foreignObject.setAttribute("height", h.toString());

    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.pointerEvents = "none"; // чтобы фон не перехватывал клики

    if (images?.top) {
      const topImg = document.createElement("img");
      topImg.src = images.top;
      topImg.style.width = "100%";
      topImg.style.objectFit = "cover";
      topImg.style.display = "block";
      container.appendChild(topImg);
    }

    if (images?.main) {
      const mainDiv = document.createElement("div");
      mainDiv.style.flex = "1";
      mainDiv.style.width = "100%";
      mainDiv.style.backgroundImage = `url(${images.main})`;
      mainDiv.style.backgroundSize = "100% auto";
      mainDiv.style.backgroundRepeat = "repeat-y";
      container.appendChild(mainDiv);
    }

    if (images?.bottom) {
      const bottomImg = document.createElement("img");
      bottomImg.src = images.bottom;
      bottomImg.style.width = "100%";
      bottomImg.style.objectFit = "cover";
      bottomImg.style.display = "block";
      container.appendChild(bottomImg);
    }

    foreignObject.appendChild(container);
    this.bgLayer.appendChild(foreignObject);
  }

  clear() {
    this.bgLayer.innerHTML = "";
    this.arrowLayer.innerHTML = "";
  }
  destroy() {
    this.svg.remove();
  }
}
