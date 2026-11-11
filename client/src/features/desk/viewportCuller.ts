import { core } from "../core/core";
import type { LNode } from "../nodes/LNode/LNode";

export class ViewportCuller {
  private rafId: number | null = null;
  private isDestroyed = false;
  private readonly defaultMargin = 600;
  private readonly hysteresisMargin = 1200;

  getVisibleWorldRect(margin = this.defaultMargin): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const viewport = core.desk?.viewport;
    if (!viewport) return null;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

    const min = viewport.screenToWorld(0, 0);
    const max = viewport.screenToWorld(vw, vh);

    const minX = Math.min(min.x, max.x) - margin;
    const maxX = Math.max(min.x, max.x) + margin;
    const minY = Math.min(min.y, max.y) - margin;
    const maxY = Math.max(min.y, max.y) + margin;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  scheduleUpdate(): void {
    if (this.rafId !== null || this.isDestroyed) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  update(): void {
    if (this.isDestroyed || !core.nodeManager || !core.desk?.viewport) return;
    const visibleRect = this.getVisibleWorldRect(this.defaultMargin);
    if (!visibleRect) return;

    const visibleNodes = new Set<LNode>(
      core.nodeManager.searchInRect(visibleRect, false),
    );

    // Если ребенок виден, гарантируем видимость его родительского фрейма
    const frameRoots = new Set<LNode>();
    for (const node of visibleNodes) {
      const mainP = node.list?.mainParent;
      if (mainP && (mainP as unknown as { frame?: { isFrame: boolean } }).frame?.isFrame) {
        frameRoots.add(mainP);
      }
    }
    for (const root of frameRoots) {
      visibleNodes.add(root);
    }

    const keepRect = this.getVisibleWorldRect(this.hysteresisMargin);

    core.nodeManager.nodes.forEach((node) => {
      if (node.hidden || node.inTrash) return;

      const isCandidateVisible = visibleNodes.has(node);

      if (isCandidateVisible) {
        if (!node.vNode && core.nodeRenderer) {
          core.nodeRenderer.createVNode(node, false);
        }
        node.vNode?.setOffscreen(false);
      } else {
        if (node.vNode && !node.vNode.isOffscreen) {
          if (
            node.isSelected ||
            node.vNode.isDragging ||
            node.vNode.body.contains(document.activeElement)
          ) {
            return;
          }

          const r = node.vNode.bodyRect;
          const insideKeep =
            keepRect &&
            r.x < keepRect.x + keepRect.width &&
            r.x + r.width > keepRect.x &&
            r.y < keepRect.y + keepRect.height &&
            r.y + r.height > keepRect.y;

          if (!insideKeep) {
            node.vNode.setOffscreen(true);
          }
        }
      }
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

