import html from "./loading.html?raw";
import "./loading.scss";

export class CLoading extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animId: number | null = null;
  private nodes!: { x: number; y: number; vx: number; vy: number }[];

  private W = 200;
  private H = 200;
  private R = 10;

  init() {
    this.innerHTML = html;
    this.canvas = this.querySelector(".ani-canvas") as HTMLCanvasElement;
    // const rect = this.canvas.getBoundingClientRect();
    // this.W = rect.width;
    // this.H = rect.height;
    this.canvas.width = this.W;
    this.canvas.height = this.H;

    this.ctx = this.canvas.getContext("2d")!;

    this.nodes = [0, 1, 2].map(() => ({
      x: 60 + Math.random() * (this.W - 120),
      y: 40 + Math.random() * (this.H - 80),
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
    }));
  }

  start() {
    const step = 2;
    const draw = () => {
      this.ctx.clearRect(0, 0, this.W, this.H);

      this.nodes.forEach((n) => {
        n.x += n.vx * step;
        n.y += n.vy * step;
        if (n.x < this.R + 10) {
          n.x = this.R + 10;
          n.vx *= -1;
        }
        if (n.x > this.W - this.R - 10) {
          n.x = this.W - this.R - 10;
          n.vx *= -1;
        }
        if (n.y < this.R + 10) {
          n.y = this.R + 10;
          n.vy *= -1;
        }
        if (n.y > this.H - this.R - 10) {
          n.y = this.H - this.R - 10;
          n.vy *= -1;
        }
      });

      [
        [0, 1],
        [1, 2],
        [0, 2],
      ].forEach(([a, b]) => {
        const nA = this.nodes[a ?? 0];
        const nB = this.nodes[b ?? 0];
        if (!nA || !nB) return;

        this.ctx.beginPath();
        this.ctx.moveTo(nA.x, nA.y);
        this.ctx.lineTo(nB.x, nB.y);
        this.ctx.strokeStyle = "#FFA46B";
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
      });

      this.nodes.forEach((n) => {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, this.R, 0, Math.PI * 2);
        this.ctx.fillStyle = "#FF8F20";
        this.ctx.fill();
        // this.ctx.strokeStyle = "rgba(29,158,117,0.9)";
        // this.ctx.lineWidth = 2;
        // this.ctx.stroke();

        // this.ctx.beginPath();
        // this.ctx.arc(n.x, n.y, this.R * 0.35, 0, Math.PI * 2);
        // this.ctx.fillStyle = "rgba(29,158,117,0.85)";
        // this.ctx.fill();
      });

      this.animId = requestAnimationFrame(draw);
    };

    draw();
  }

  stop() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  destroy() {
    this.stop();
    this.canvas.remove();
  }
  show() {
    this.classList.add("show");
    this.start();
  }
  hide() {
    this.classList.remove("show");
    this.stop();
  }
  connectedCallback() {
    this.init();
  }
}

customElements.define("c-loading", CLoading);
