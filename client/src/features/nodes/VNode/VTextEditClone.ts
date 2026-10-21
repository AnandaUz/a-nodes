import type { LNode_TEClone } from "../LNode/LNode_TEClone";
import VTextEdit from "./VTextEdit";

export default class VTextEditClone extends VTextEdit {
  elLineOfParentsTitle!: HTMLDivElement;
  declare node: LNode_TEClone;

  init(): void {
    super.init();
    this.body.classList.add("is-clone");
    this.elLineOfParentsTitle = this.body.querySelector(
      ".el-lineOfParentsTitle",
    ) as HTMLDivElement;
  }
  render(): void {
    this.node.setLineOfParentsTitle();

    const title = this.node.clones.sourceNode?.title || "$$$$$$";
    if (title) {
      const str = title.replace(/\n/g, "<br/>");
      if (str !== this.titleEl.innerHTML) {
        this.titleEl.innerHTML = str;
      }
    }
    this.refreshListBtns();
  }
  bodyInit() {
    super.bodyInit();
    this.body.innerHTML += `
    <div class="el-lineOfParentsTitle"></div>     
`;
  }
}
