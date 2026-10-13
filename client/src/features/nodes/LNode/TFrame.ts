import { core } from "@/features/core/core";
import type { LNode_TextEdit } from "./LNode_TextEdit";
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
    this.owner.list.setPositionForChildren(rect.y + 5);
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
  /** иницируем кнопки добавления клонов */
  initBtns() {
    this.owner.list.forEachChildren((child) => {
      if (this.owner === child) return;
      const vNode = child.vNode as VTextEdit;
      if (vNode) {
        vNode.body.classList.add("in-frame");
      }
      if (this.children.size > 0) {
        this.children.forEach((chFrame) => {
          vNode?.addFramePowerBtn(
            () => {
              chFrame.frame.addCloneOfNode(child as LNode_TextEdit);
            },
            () => {
              (child as LNode_TextEdit).clones?.removeAllClones();
              vNode.setRating(-1, chFrame.lID || 0);
            },
            chFrame.lID || 0,
          );
        });
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
        const path = new Ge_Path();
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
        const parentRect = parent.node.getNodeRect(false);
        const newRect = this.owner.getNodeRect(false);
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

    newNode.frame.isFrame = true;
    newNode.title = this.owner.title;

    const path = new Ge_Path();
    newNode.frame.parents.add({ node: this.owner, path });
    this.owner.frame.children.add(newNode);

    newNode.vNode?.render();

    newNode.save();
    newNode.frame.redrawPaths();
  }
}
