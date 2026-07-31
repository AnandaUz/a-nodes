import "./new.scss";
import html from "./new.html?raw";

export class CNew extends HTMLElement {
  connectedCallback() {
    this.innerHTML = html;
    this.classList.add("new");
  }
}

customElements.define("c-new", CNew);
