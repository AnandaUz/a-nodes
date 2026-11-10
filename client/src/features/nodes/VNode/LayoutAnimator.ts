import type { VNode } from "./VNode";

interface AnimationTask {
  vNode: VNode;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
  delayTimer?: ReturnType<typeof setTimeout> | undefined;
}

export class LayoutAnimator {
  private tasks = new Map<VNode, AnimationTask>();
  private rafId: number | null = null;
  private readonly duration = 200;

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }

  animate(
    vNode: VNode,
    x: number | null = null,
    y: number | null = null,
    delay = 0,
  ): void {
    if (x === null && y === null) return;

    this.cancel(vNode);

    const targetX = x ?? vNode.node.x;
    const targetY = y ?? vNode.node.y;
    const startX = vNode.node.x;
    const startY = vNode.node.y;

    if (startX === targetX && startY === targetY) return;

    const task: AnimationTask = {
      vNode,
      startX,
      startY,
      targetX,
      targetY,
      startTime: 0,
      duration: this.duration,
    };

    if (delay > 0) {
      task.delayTimer = setTimeout(() => {
        task.delayTimer = undefined;
        task.startTime = performance.now();
        this.tasks.set(vNode, task);
        this.startLoopIfNeeded();
      }, delay);
      this.tasks.set(vNode, task);
    } else {
      task.startTime = performance.now();
      this.tasks.set(vNode, task);
      this.startLoopIfNeeded();
    }
  }

  cancel(vNode: VNode): void {
    const existing = this.tasks.get(vNode);
    if (existing) {
      if (existing.delayTimer) {
        clearTimeout(existing.delayTimer);
      }
      this.tasks.delete(vNode);
      if (this.tasks.size === 0 && this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  private startLoopIfNeeded(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    let hasActive = false;

    for (const [vNode, task] of Array.from(this.tasks.entries())) {
      if (task.delayTimer) {
        hasActive = true;
        continue;
      }

      const elapsed = now - task.startTime;
      const t = Math.min(elapsed / task.duration, 1);
      const ease = this.easeOut(t);

      const newX = task.startX + (task.targetX - task.startX) * ease;
      const newY = task.startY + (task.targetY - task.startY) * ease;

      vNode.node.x = newX;
      vNode.node.y = newY;
      vNode.applyPosition();

      if (t >= 1) {
        vNode.node.moveTo({ x: task.targetX, y: task.targetY });
        this.tasks.delete(vNode);
      } else {
        hasActive = true;
      }
    }

    if (hasActive && this.tasks.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  };
}

export const layoutAnimator = new LayoutAnimator();

