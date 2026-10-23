import { LNode } from "./LNode";

export default class TClones {
  owner: LNode;

  /** нода родитель */
  protected _mainNode!: LNode;
  mainNodeLID = 0;
  sourceNode: LNode | undefined;

  nodes = new Set<LNode>();

  constructor(owner: LNode) {
    this.owner = owner;
  }
  removeAllClones() {
    this.nodes.clear();
  }
  doForAll(fn: (node: LNode) => void) {
    if (!this.sourceNode) return;
    if (this.sourceNode.clones.nodes.size == 0) return;

    const allNodes = new Set<LNode>();

    const refFunc = (cl: LNode) => {
      allNodes.add(cl);

      cl.clones.nodes.forEach((node: LNode) => {
        refFunc(node);
      });
    };

    refFunc(this.sourceNode);

    allNodes.forEach((node) => {
      fn(node);
    });
  }
  get mainNode(): LNode {
    return this._mainNode;
  }
  set mainNode(mainNode: LNode) {
    this._mainNode = mainNode;
    this.mainNodeLID = mainNode.lID || 0;
  }
}
