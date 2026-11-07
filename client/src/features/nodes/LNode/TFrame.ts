import { core } from "@/features/core/core";
import { LNode_TextEdit } from "./LNode_TextEdit";
import { GRID } from "@/features/core/CONST";
import Tools from "@/features/core/Tools";
import { Ge_Path } from "@/features/desk/DeskSVG/Ge_Path";
import { NODE_TYPES } from "../node-registry";
import type VTextEdit from "../VNode/VTextEdit";

interface IParent {
  node: LNode_TextEdit;
  path: Ge_Path;
}
export type FrameIoMode = "in" | "normal" | "out";

export default class TFrame {
  owner: LNode_TextEdit;
  parents: Set<IParent> = new Set();
  children: Set<LNode_TextEdit> = new Set();
  parentsLID: number[] = [];
  // paths: Ge_Path[] = [];

  _isFrame = false;
  private _isFrameIn = false;
  private _isFrameOut = false;
  constructor(owner: LNode_TextEdit) {
    this.owner = owner;
  }
  addCloneOfNode(node: LNode_TextEdit) {
    const rect = this.owner.getNodeRect(false);

    const newNode = core.nodeManager.create_TextEditCloneNode(
      node,
      rect.x + GRID.x,
      rect.y + rect.height,
    );

    core.nodeManager.ensureLID(this.owner);
    newNode.list.setParent(this.owner, 0);
    this.owner.list.setPositionForChildren();
    newNode.vNode?.render();
    this.bringToFront();
  }
  setBtnsState() {
    this.owner.list.forEachChildren((child) => {
      if (this.owner === child) return;
      const vNode = child.vNode as VTextEdit;
      if (!vNode) return;

      const mainNodeForClone = (child as LNode_TextEdit).clones?.mainNode;
      if (mainNodeForClone && mainNodeForClone.vNode) {
        const btnBlock = mainNodeForClone.vNode.body.querySelector(
          ".btn-" + this.owner.lID,
        );
        if (btnBlock) {
          btnBlock.classList.add("active");
        }
      }
    });
  }
  get frameNode(): LNode_TextEdit | undefined {
    return this.owner.list.mainParent as LNode_TextEdit;
  }
  /** находится ли нода во фрейме */
  get isInFrame() {
    const mainParent = this.owner.list.mainParent;
    if (!mainParent) return false;
    if (mainParent instanceof LNode_TextEdit) {
      return mainParent.frame.isFrame;
    }
    return false;
  }
  /** добавляем кнопки управления */
  addPowerBtns() {
    if (this.owner.isOutGroupHeader) return;
    const vNode = this.owner.vNode;
    if (!vNode) return;
    if (this.frameNode && this.frameNode.frame.children.size > 0) {
      this.frameNode.frame.children.forEach((chFrame) => {
        vNode.addFramePowerBtn(
          () => {
            chFrame.frame.addCloneOfNode(this.owner);
          },
          () => {
            core.nodeManager.removeAllClones(this.owner);
            vNode.setRating(-1, chFrame.lID || 0);
          },
          chFrame.lID || 0,
        );
      });
    }
  }
  /** иницируем кнопки добавления клонов */
  initBtns() {
    this.owner.list.forEachChildren((child) => {
      if (this.owner === child) return;
      const vNode = child.vNode as VTextEdit;
      if (vNode) {
        vNode.body.classList.add("in-frame");
      }
      if (child instanceof LNode_TextEdit) {
        child.frame.addPowerBtns();
      }
    });
  }
  /** подключаем детей к родителям */
  init() {
    (this.owner.vNode as VTextEdit)?.turnOn_frameMode();
    this.updateIoClasses();
    if (this.parentsLID.length === 0) return;

    this.parentsLID.forEach((id) => {
      const parentNode = core.nodeManager.getNodeByLID(id) as LNode_TextEdit;
      if (parentNode) {
        const path = this.makePath(parentNode);
        this.parents.add({ node: parentNode, path });
        parentNode.frame.children.add(this.owner);
      }
    });

    this.redrawPaths();
  }
  redrawPaths() {
    if (this.parents) {
      this.parents.forEach((parent) => {
        const path = parent.path;
        const parentRect = parent.node.getNodeRect(true);
        const newRect = this.owner.getNodeRect(true);
        path.draw(
          { x: parentRect.x + parentRect.width, y: parentRect.y + 10 },
          { x: newRect.x, y: newRect.y + 10 },
        );
      });
    }

    if (this.children) {
      this.children.forEach((child) => {
        child.frame.redrawPaths();
      });
    }
  }
  /** создаёт путь связи parent → child и делает его выделяемым */
  private makePath(parent: LNode_TextEdit, child: LNode_TextEdit = this.owner) {
    const path = new Ge_Path();
    path.link = { child, parent };
    path.enableSelect((p) => core.desk.selectPath(p));
    return path;
  }
  /** является ли node потомком this.owner (по цепочке children) */
  private hasDescendant(node: LNode_TextEdit): boolean {
    const seen = new Set<LNode_TextEdit>();
    const walk = (n: LNode_TextEdit): boolean => {
      for (const ch of n.frame.children) {
        if (ch === node) return true;
        if (seen.has(ch)) continue;
        seen.add(ch);
        if (walk(ch)) return true;
      }
      return false;
    };
    return walk(this.owner);
  }
  /** можно ли сделать parent родителем этого фрейма (дубли, self, циклы — нельзя) */
  canLinkTo(parent: LNode_TextEdit): boolean {
    if (parent === this.owner || !parent.frame.isFrame) return false;
    for (const p of this.parents) if (p.node === parent) return false;
    return !this.hasDescendant(parent);
  }
  /** связать: parent становится родителем этого фрейма */
  linkToParent(parent: LNode_TextEdit) {
    if (!this.canLinkTo(parent)) return;
    core.nodeManager.ensureLID(parent);
    core.nodeManager.ensureLID(this.owner);
    this.parents.add({ node: parent, path: this.makePath(parent) });
    parent.frame.children.add(this.owner);
    parent.frame.initBtns();
    parent.frame.setBtnsState();
    this.parentsLID = this.pack();
    this.owner.save();
    this.redrawPaths();
  }
  /** разорвать связь с родителем (клоны не трогаем) */
  unlinkFromParent(parent: LNode_TextEdit) {
    for (const p of Array.from(this.parents)) {
      if (p.node !== parent) continue;
      p.path.remove();
      this.parents.delete(p);
    }
    parent.frame.children.delete(this.owner);
    this.parentsLID = this.pack();
    const lid = this.owner.lID || 0;
    parent.list.forEachChildren((child) => {
      if (child === parent) return;
      (child.vNode as VTextEdit | undefined)?.removeFramePowerBtnFor(lid);
    });
    this.owner.save();
  }
  pack(): number[] {
    return Array.from(this.parents).map((i) => i.node.lID || 0);
  }
  set isFrame(v: boolean) {
    if (this._isFrame === v) return;
    this._isFrame = v;
  }
  get isFrame() {
    return this._isFrame;
  }
  addFrame() {
    this.isFrame = true;

    const rect = this.owner.getNodeRect();

    core.nodeManager.ensureLID(this.owner);

    const exData = this.owner.exData
      ? structuredClone(this.owner.exData)
      : undefined;
    if (exData) {
      delete exData.url;
      delete exData.ownerNodesIds;
    }

    const newNode = core.nodeManager.copyNode(this.owner, {
      type: NODE_TYPES.TEXT_EDIT.id,
      x: Tools.getDiskPosition(this.owner.x + rect.width + GRID.x),
      y: rect.y,
      exData,
    }) as LNode_TextEdit;

    newNode.title = this.owner.title;

    const path = this.makePath(this.owner, newNode);
    newNode.frame.parents.add({ node: this.owner, path });
    newNode.frame.parentsLID = newNode.frame.pack();
    this.owner.frame.children.add(newNode);

    core.nodeRenderer.createVNode(newNode);
    newNode.frame.turnOn_frameMode();
    this.initBtns();

    newNode.save();
    newNode.frame.redrawPaths();
  }
  turnOn_frameMode() {
    this.isFrame = true;
    this.owner.vNode?.turnOn_frameMode();
    this.updateIoClasses();
  }
  turnOff_frameMode() {
    this.isFrame = false;
    this._isFrameIn = false;
    this._isFrameOut = false;
    this.updateIoClasses();
    this.owner.vNode?.turnOff_frameMode();
    // this.deinitBtns();
  }
  get isFrameIn(): boolean {
    return this._isFrameIn;
  }
  set isFrameIn(v: boolean) {
    if (this._isFrameIn === v) return;
    this._isFrameIn = v;
    if (v) this._isFrameOut = false;
    this.updateIoClasses();
  }

  get isFrameOut(): boolean {
    return this._isFrameOut;
  }
  set isFrameOut(v: boolean) {
    if (this._isFrameOut === v) return;
    this._isFrameOut = v;
    if (v) this._isFrameIn = false;
    this.updateIoClasses();
  }

  get ioMode(): FrameIoMode {
    if (this._isFrameIn) return "in";
    if (this._isFrameOut) return "out";
    return "normal";
  }

  setIoMode(mode: FrameIoMode): void {
    if (mode === "in") {
      if (!this.isFrame) this.turnOn_frameMode();
      core.nodeManager?.ensureLID(this.owner);
      this.resetOtherIoFrames("in");
      this._isFrameIn = true;
      this._isFrameOut = false;
    } else if (mode === "out") {
      if (!this.isFrame) this.turnOn_frameMode();
      core.nodeManager?.ensureLID(this.owner);
      this._isFrameIn = false;
      this._isFrameOut = true;
    } else {
      this._isFrameIn = false;
      this._isFrameOut = false;
    }
    this.updateIoClasses();
    this.owner.save();
    core.nodeManager?.syncCurrentPageOutData?.();
  }

  private resetOtherIoFrames(mode: "in" | "out"): void {
    if (!core.nodeManager?.nodes) return;
    for (const node of core.nodeManager.nodes) {
      if (node === this.owner) continue;
      const frame = (node as any).frame as TFrame | undefined;
      if (!frame) continue;
      if (mode === "in" && frame.isFrameIn) {
        frame.isFrameIn = false;
        node.save();
      } else if (mode === "out" && frame.isFrameOut) {
        frame.isFrameOut = false;
        node.save();
      }
    }
  }

  updateIoClasses(): void {
    const vNode = this.owner.vNode;
    if (vNode?.body) {
      vNode.body.classList.toggle("frame-in", Boolean(this._isFrameIn));
      vNode.body.classList.toggle("frame-out", Boolean(this._isFrameOut));
    }
    if (vNode?.elFrameBg) {
      vNode.elFrameBg.classList.toggle("frame-in", Boolean(this._isFrameIn));
      vNode.elFrameBg.classList.toggle("frame-out", Boolean(this._isFrameOut));
    }
  }

  get frameLID() {
    return this.owner.list.mainParent?.lID || 0;
  }
  turnOff_PowerBtn(subFrameLID: number) {
    const vNode = this.owner.vNode;
    if (!vNode) return;

    const btn = vNode.body.querySelector(".btn-" + subFrameLID);
    if (btn) {
      btn.classList.remove("active");
    }
    vNode.setRating(-1, subFrameLID);
  }

  static nextZIndex = 200;

  bringToFront() {
    const root = this.isFrame ? this.owner : this.frameNode;
    if (!root) return;

    const rootVNode = root.vNode as VTextEdit | undefined;
    const frameBg = rootVNode?.elFrameBg;

    const isAlreadyAtTop =
      (frameBg && frameBg.style.zIndex === String(TFrame.nextZIndex - 2)) ||
      (!frameBg &&
        rootVNode?.body.style.zIndex === String(TFrame.nextZIndex - 1));

    let z: number;
    if (isAlreadyAtTop) {
      z = TFrame.nextZIndex - 2;
      if (frameBg && frameBg.style.zIndex !== String(z)) {
        frameBg.style.zIndex = String(z);
      }
    } else {
      z = TFrame.nextZIndex;
      TFrame.nextZIndex += 2;

      if (frameBg) {
        frameBg.style.zIndex = String(z);
      }
      if (rootVNode) {
        rootVNode.body.style.zIndex = String(z + 1);
      }
    }

    const childZ = String(z + 1);
    root.list.forEachChildren((child) => {
      if (child === root) return;
      if (child.vNode && child.vNode.body.style.zIndex !== childZ) {
        child.vNode.body.style.zIndex = childZ;
      }
    });
  }
}
