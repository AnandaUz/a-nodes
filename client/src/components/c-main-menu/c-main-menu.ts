import htmlContent from "./c-main-menu.html?raw";
import styleContent from "./c-main-menu.scss?inline";
import { commands, type UICommand } from "@/features/core/comands";

const template = document.createElement("template");
template.innerHTML = `<style>${styleContent}</style>${htmlContent}`;

const ARROW_RIGHT_SVG = `
  <svg width="9" height="18" viewBox="0 0 9 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 14L7 9L2 4" stroke="var(--main-menu-arrow-color, #d94302)" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

export class CMainMenu extends HTMLElement {
  private isInitialized = false;
  private menuNavEl: HTMLElement | null = null;
  private activeTabIndex: number | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    if (!this.isInitialized) {
      this.render();
      this.isInitialized = true;
    }

    document.addEventListener("pointerdown", this.onDocumentPointerDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
  }

  private onDocumentPointerDown = (e: PointerEvent): void => {
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.closeAll();
    }
  };

  private closeAll(): void {
    this.activeTabIndex = null;
    this.updateDropdownsVisibility();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));
    this.menuNavEl = this.shadowRoot.querySelector(".main-menu");
    if (!this.menuNavEl) return;

    this.renderMenu(commands);
  }

  private renderMenu(items: UICommand[]): void {
    if (!this.menuNavEl) return;
    this.menuNavEl.innerHTML = "";

    items.forEach((tabCmd, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "menu-tab-wrapper";
      wrapper.dataset.name = "таб";

      const tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.className = "menu-tab-btn";
      tabBtn.dataset.name = tabCmd.label;
      tabBtn.textContent = tabCmd.label;
      if (tabCmd.description) {
        tabBtn.title = tabCmd.description;
      }

      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleTab(index);
      });

      wrapper.appendChild(tabBtn);

      if (tabCmd.children && tabCmd.children.length > 0) {
        const dropdown = this.createDropdown(tabCmd.children);
        wrapper.appendChild(dropdown);
      }

      this.menuNavEl!.appendChild(wrapper);
    });
  }

  private toggleTab(index: number): void {
    this.activeTabIndex = this.activeTabIndex === index ? null : index;
    this.updateDropdownsVisibility();
  }

  private updateDropdownsVisibility(): void {
    if (!this.menuNavEl) return;
    const wrappers = this.menuNavEl.querySelectorAll<HTMLElement>(".menu-tab-wrapper");
    wrappers.forEach((wrap, i) => {
      const btn = wrap.querySelector<HTMLElement>(".menu-tab-btn");
      const dropdown = wrap.querySelector<HTMLElement>(".menu-dropdown");
      const isActive = this.activeTabIndex === i;

      btn?.classList.toggle("active", isActive);
      dropdown?.classList.toggle("open", isActive);

      if (!isActive && dropdown) {
        dropdown.querySelectorAll<HTMLElement>(".submenu-dropdown").forEach((sub) => {
          sub.classList.remove("open");
        });
      }
    });
  }

  private createDropdown(items: UICommand[], isSubmenu = false): HTMLElement {
    const list = document.createElement("div");
    list.className = isSubmenu ? "submenu-dropdown" : "menu-dropdown";
    list.dataset.name = isSubmenu ? "раскрывающийся список" : "всплывающее меню";

    items.forEach((item) => {
      if (item.divider) {
        const divider = document.createElement("div");
        divider.className = "menu-divider";
        divider.dataset.name = "разделитель";
        divider.innerHTML = `
          <span class="menu-divider-line"></span>
          <span class="menu-divider-dot"></span>
          <span class="menu-divider-line"></span>
        `;
        list.appendChild(divider);
        return;
      }

      const itemEl = document.createElement("div");
      itemEl.className = "menu-item";
      itemEl.dataset.name = item.children && item.children.length > 0 ? "раскрывающийся список" : item.label;
      if (item.description) {
        itemEl.title = item.description;
      }

      const labelEl = document.createElement("span");
      labelEl.className = "menu-item-label";
      labelEl.dataset.name = "название";
      labelEl.textContent = item.label;
      itemEl.appendChild(labelEl);

      const hasChildren = Boolean(item.children && item.children.length > 0);

      if (hasChildren) {
        itemEl.classList.add("has-children");
        const arrowEl = document.createElement("span");
        arrowEl.className = "menu-item-arrow";
        arrowEl.dataset.name = "стрелка";
        arrowEl.innerHTML = ARROW_RIGHT_SVG;
        itemEl.appendChild(arrowEl);

        const subList = this.createDropdown(item.children!, true);
        itemEl.appendChild(subList);

        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        itemEl.addEventListener("mouseenter", () => {
          if (timeoutId) clearTimeout(timeoutId);
          itemEl.classList.add("hovered");
          subList.classList.add("open");
        });

        itemEl.addEventListener("mouseleave", () => {
          timeoutId = setTimeout(() => {
            itemEl.classList.remove("hovered");
            subList.classList.remove("open");
          }, 150);
        });
      } else {
        if (item.shortcuts && item.shortcuts.length > 0) {
          const shortcutEl = document.createElement("span");
          shortcutEl.className = "menu-item-shortcut";
          shortcutEl.dataset.name = "горячая клавиша";
          shortcutEl.textContent = item.shortcuts.join(", ");
          itemEl.appendChild(shortcutEl);
        }

        itemEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeAll();
          item.execute?.(e);
        });
      }

      list.appendChild(itemEl);
    });

    return list;
  }
}

if (!customElements.get("c-main-menu")) {
  customElements.define("c-main-menu", CMainMenu);
}
