import VTextEdit from "./VTextEdit";

export default class VTextEditClone extends VTextEdit {
  init(): void {
    super.init();
    this.body.classList.add("is-clone");
  }
  render(): void {
    super.render();
  }

  // onInput() {
  //   this.sourceVNodetitle = this.titleEl.innerText;
  //   const startH = this.height;
  //   this.refreshBodyRect();
  //   const endH = this.height;

  //   if (startH < endH) {
  //     // this.moveAniTo(null, this.y - (endH - startH));
  //     const rect = { ...this.bodyRect, height: endH };
  //     core.nodeRenderer.pushdown_nodes_out_of_rect(rect, [this]);
  //   }

  //   //обновляем детей
  //   this.subNodes.forEach((subNode) => {
  //     subNode.title = this.title;
  //   });
  // }
}
