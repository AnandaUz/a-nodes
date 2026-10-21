import { core } from "@/features/core/core";
import { LNode_TextEdit } from "./LNode_TextEdit";
import { GRID } from "@/features/core/CONST";
import Tools from "@/features/core/Tools";
import { Ge_Path } from "@/features/desk/DeskSVG/Ge_Path";
import type VTextEdit from "../VNode/VTextEdit";

interface IParent {
  node: LNode_TextEdit;
  path: Ge_Path;
}
export default class TFrame {
  owner: LNode_TextEdit;
  parents: Set<IParent> = new Set();
  children: Set<LNode_TextEdit> = new Set();
  parentsLID: number[] = [];
  // paths: Ge_Path[] = [];

  _isFrame = false;
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

    newNode.list.setParent(this.owner, 0);
    this.owner.list.setPositionForChildren();
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
    const vNode = this.owner.vNode;
    if (!vNode) return;
    if (this.frameNode && this.frameNode.frame.children.size > 0) {
      this.frameNode.frame.children.forEach((chFrame) => {
        vNode.addFramePowerBtn(
          () => {
            chFrame.frame.addCloneOfNode(this.owner);
          },
          () => {
            this.owner.clones?.removeAllClones();
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
    if (!parent.lID) {
      parent.lID = core.nodeManager.getMaxLID() + 1;
      parent.save();
    }
    if (!this.owner.lID) {
      this.owner.lID = core.nodeManager.getMaxLID() + 1;
    }
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

    if (!this.owner.lID) {
      this.owner.lID = core.nodeManager.getMaxLID() + 1;
      this.owner.save();
    }

    const newNode = core.nodeManager.copyNode(this.owner, {
      x: Tools.getDiskPosition(this.owner.x + rect.width + GRID.x),
      y: rect.y,
    }) as LNode_TextEdit;

    newNode.title = this.owner.title;

    const path = this.makePath(this.owner, newNode);
    newNode.frame.parents.add({ node: this.owner, path });
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
  }
  turnOff_frameMode() {
    this.isFrame = false;
    this.owner.vNode?.turnOff_frameMode();
    // this.deinitBtns();
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

    const z = TFrame.nextZIndex;
    TFrame.nextZIndex += 2;

    // 1. Фон фрейма (подложка)
    const frameBg = (root.vNode as VTextEdit)?.elFrameBg;
    if (frameBg) {
      frameBg.style.zIndex = String(z);
    }

    // 2. Заголовок
    if (root.vNode) {
      root.vNode.body.style.zIndex = String(z + 1);
    }

    // 3. Все дочерние ноды
    root.list.forEachChildren((child) => {
      if (child === root) return;
      if (child.vNode) {
        child.vNode.body.style.zIndex = String(z + 1);
      }
    });
  }
}
