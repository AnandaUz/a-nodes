import { VPage } from "@/features/nodes/VNode/VPage";
import { LNode_TextEdit } from "@/features/nodes/LNode/LNode_TextEdit";
import { core } from "@/features/core/core";
import { NODE_TYPES } from "@/features/nodes/node-registry";
import { fromDB } from "@shared/types/INodeDB";
import type { LNode } from "@/features/nodes/LNode/LNode";
import { applyTreeVisibility } from "@/features/nodes/nodeTreeUtils";

export class LNode_Page extends LNode_TextEdit {
  override selectedOutLID: number = 0;
  override outLimit: number = 10;
  private renderedOutNodes = new Map<string, LNode>();

  getVNodeType() {
    return VPage;
  }

  setSelectedOutFrame(lID: number) {
    const next = Math.max(0, lID || 0);
    if ((this.selectedOutLID || 0) === next) return;
    this.selectedOutLID = next;
    this.checkOutNodesMode();
    this.vNode?.render();
    this.save();
  }

  setOutLimit(limit: number) {
    const next = Math.max(0, Math.min(254, Math.round(limit ?? 10)));
    if ((this.outLimit ?? 10) === next) return;
    this.outLimit = next;
    this.checkOutNodesMode();
    this.vNode?.render();
    this.save();
  }

  clearRenderedOutNodes() {
    for (const [, outNode] of this.renderedOutNodes) {
      outNode.list._parentNode = null;
      outNode.list.children?.clear();
      outNode.vNode?.remove();
      core.nodeManager?.nodes.delete(outNode);
      core.nodeManager?.spatialIndex.remove(outNode);
    }
    this.renderedOutNodes.clear();
    this.list.children?.clear();
  }

  override remove() {
    this.clearRenderedOutNodes();
    super.remove();
  }

  checkOutNodesMode() {
    if (!this.vNode || core.nodeManager?.pageNode === this) return;

    const rawFrames = Array.isArray(this.out) ? this.out.filter(Boolean) : [];
    const hasSpecific =
      (this.selectedOutLID || 0) > 0 &&
      rawFrames.some((f) => f.lID === this.selectedOutLID);
    const activeFrames = hasSpecific
      ? rawFrames.filter((f) => f.lID === this.selectedOutLID)
      : rawFrames;

    const usedKeys = new Set<string>();
    if (!this.list.children) {
      this.list.children = new Set<LNode>();
    } else {
      this.list.children.clear();
    }

    let rootIndex = 0;
    const limit = this.outLimit ?? 10;

    for (const frameData of activeFrames) {
      const rawItems = Array.isArray(frameData.items) ? frameData.items : [];
      const items = rawItems.slice(0, Math.max(0, limit));
      if (items.length === 0) continue;

      if (activeFrames.length > 1 && items.length > 0) {
        const hdrKey = `hdr_${frameData.lID}`;
        usedKeys.add(hdrKey);

        let hdrNode = this.renderedOutNodes.get(hdrKey);
        if (!hdrNode) {
          hdrNode = core.nodeManager.addNode(NODE_TYPES.TEXT_EDIT.id);
          if (hdrNode) {
            hdrNode._id = "";
            hdrNode.isOutGroupHeader = true;
            hdrNode.isLockedInOutFrame = true;
            hdrNode.outFrameLID = frameData.lID;
            core.nodeRenderer.createVNode(hdrNode);
            this.renderedOutNodes.set(hdrKey, hdrNode);
          }
        }

        if (hdrNode) {
          hdrNode.title = frameData.t || (frameData as any).title || "Исходящие";
          hdrNode.isOutGroupHeader = true;
          hdrNode.isLockedInOutFrame = true;
          hdrNode.outFrameLID = frameData.lID;
          hdrNode.list._parentNode = this;
          hdrNode.list.parentLID = this.lID;
          hdrNode.list._tab = 0;
          hdrNode.list.index = rootIndex++;
          hdrNode.list.children?.clear();
          this.list.children.add(hdrNode);
          hdrNode.vNode?.render();
        }
      }

      const groupNodesByLID = new Map<number, LNode>();

      for (const item of items) {
        const itemKey = `item_${frameData.lID}_${item._id || item.lID}`;
        usedKeys.add(itemKey);
        const targetType = item.c
          ? NODE_TYPES.TEXT_EDIT_CLONE.id
          : NODE_TYPES.TEXT_EDIT.id;

        let childNode = this.renderedOutNodes.get(itemKey);
        if (childNode && childNode.type !== targetType) {
          childNode.vNode?.remove();
          core.nodeManager.nodes.delete(childNode);
          core.nodeManager.spatialIndex.remove(childNode);
          this.renderedOutNodes.delete(itemKey);
          childNode = undefined;
        }

        if (!childNode) {
          childNode = core.nodeManager.addNode(targetType);
          if (childNode) {
            core.nodeManager.nodes.add(childNode);
            core.nodeRenderer.createVNode(childNode);
            this.renderedOutNodes.set(itemKey, childNode);
          }
        }

        if (!childNode) continue;

        fromDB(
          {
            _id: item._id,
            pI: this._id,
            T: targetType,
            t: item.t ?? (item as any).title,
            c: item.c,
            s: item.s,
            D: item.D,
          },
          childNode,
        );

        childNode.isLockedInOutFrame = true;
        childNode.outFrameLID = frameData.lID;
        childNode.outOrigParentLID = item.parentLID || frameData.lID;
        childNode.list.children?.clear();

        const parentInGroup =
          item.parentLID &&
          item.parentLID !== frameData.lID &&
          groupNodesByLID.get(item.parentLID);

        if (parentInGroup) {
          if (!parentInGroup.list.children) {
            parentInGroup.list.children = new Set<LNode>();
          }
          childNode.list._parentNode = parentInGroup;
          childNode.list.parentLID = parentInGroup.lID;
          childNode.list._tab = Math.max(1, item.tab || 1);
          childNode.list.index = parentInGroup.list.children.size;
          parentInGroup.list.children.add(childNode);
        } else {
          childNode.list._parentNode = this;
          childNode.list.parentLID = this.lID;
          childNode.list._tab = Math.max(1, item.tab || 1);
          childNode.list.index = rootIndex++;
          this.list.children.add(childNode);
        }

        if (item.lID) {
          groupNodesByLID.set(item.lID, childNode);
        }

        childNode.vNode?.render();
        childNode.repeatMode.refreshIndicator();
        core.nodeManager.spatialIndex.insert(childNode);
      }
    }

    for (const [key, oldNode] of this.renderedOutNodes) {
      if (!usedKeys.has(key)) {
        oldNode.list._parentNode = null;
        oldNode.list.children?.clear();
        oldNode.vNode?.remove();
        core.nodeManager.nodes.delete(oldNode);
        core.nodeManager.spatialIndex.remove(oldNode);
        this.renderedOutNodes.delete(key);
      }
    }

    const hasChildren = Boolean(this.list?.children && this.list.children.size > 0);
    if (hasChildren) {
      if (!this.frame.isFrame || !this.vNode?.isFrameMode) {
        this.frame.turnOn_frameMode();
      }
      applyTreeVisibility(this);
      this.frame.initBtns();
      this.frame.setBtnsState();
      this.list.setPositionForChildren();
      this.vNode?.renderSVG();
    } else {
      if (this.frame.isFrame || this.vNode?.isFrameMode) {
        this.frame.turnOff_frameMode();
        this.vNode?.renderSVG();
      }
    }
    (this.vNode as VPage | undefined)?.refreshListBtns();
  }
}
