import type { LNode_TEClone } from "../LNode/LNode_TEClone";
import VTextEdit from "./VTextEdit";

export default class VTextEditClone extends VTextEdit {
  elLineOfParentsTitle!: HTMLDivElement;

  init(): void {
    super.init();
    this.body.classList.add("is-clone");
    this.elLineOfParentsTitle = this.body.querySelector(
      ".el-lineOfParentsTitle",
    ) as HTMLDivElement;
  }
  render(): void {
    super.render();
    (this.node as LNode_TEClone).setLineOfParentsTitle();
  }
  bodyInit() {
    this.body.innerHTML = `
    <div class="el-lineOfParentsTitle"></div>     
    <div class="title-el"></div>                 
`;
  }
}
