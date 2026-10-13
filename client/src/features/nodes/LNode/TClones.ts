import { LNode_TextEdit } from "./LNode_TextEdit";
import { LNode_TEClone } from "./LNode_TEClone";
import { core } from "@/features/core/core";

export default class TClones {
  owner: LNode_TextEdit;

  /** нода родитель */
  protected _mainNode!: LNode_TextEdit;
  mainNodeLID = 0;
  sourceNode: LNode_TextEdit | undefined;

  nodes = new Set<LNode_TEClone>();

  constructor(owner: LNode_TextEdit) {
    this.owner = owner;
  }
  removeAllClones() {
    this.nodes.forEach((node) => {
      core.nodeManager.putNodeInTrash(node);
    });
    this.nodes.clear();
  }
  doForAll(fn: (node: LNode_TextEdit) => void) {
    if (!this.sourceNode) return;
    if (this.sourceNode.clones.nodes.size == 0) return;

    const allNodes = new Set<LNode_TextEdit>();

    const refFunc = (cl: LNode_TextEdit) => {
      allNodes.add(cl);

      cl.clones.nodes.forEach((node: LNode_TEClone) => {
        refFunc(node);
      });
    };

    refFunc(this.sourceNode);

    allNodes.forEach((node) => {
      fn(node);
    });
  }
  get mainNode(): LNode_TextEdit {
    return this._mainNode;
  }
  set mainNode(mainNode: LNode_TextEdit) {
    this._mainNode = mainNode;
    this.mainNodeLID = mainNode.lID || 0;
  }
  // get sourceNode(): LNode_TextEdit {
  //   if (this._sourceNode) return this._sourceNode;
  //   // if (!this.mainNode) {
  //   //   if (this.owner instanceof LNode_TEClone) return undefined;
  //   //   else return this.owner;
  //   // }

  //   let sNode: LNode_TextEdit = this.owner;
  //   while (sNode instanceof LNode_TEClone) {
  //     if (!sNode.clones.mainNode) break;
  //     sNode = sNode.clones.mainNode;
  //   }
  //   this._sourceNode = sNode;
  //   return sNode;
  // }
}
