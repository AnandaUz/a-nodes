import htmlContent from "./c-breadcrumbs.html?raw";
import styleContent from "./c-breadcrumbs.scss?inline";
import { breadcrumbsService } from "@/features/breadcrumbs/breadcrumbsService";
import type { BreadcrumbItem } from "@/features/core/interfaces";
import { router } from "@/router";

const template = document.createElement("template");
template.innerHTML = `<style>${styleContent}</style>${htmlContent}`;

const SEPARATOR_SVG = `
  <span class="crumb-separator" aria-hidden="true">
    <svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.75 6.75L3.75 3.75L0.75 0.75" stroke="#FF7700" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </span>
`;

export class CBreadcrumbs extends HTMLElement {
  private isInitialized = false;
  private unsubscribe?: (() => void) | undefined;
  private listEl: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  private onRootClick = (e: Event): void => {
    this.handleClick(e as MouseEvent);
  };

  connectedCallback(): void {
    if (!this.isInitialized) {
      this.render();
      this.isInitialized = true;
    }

    this.unsubscribe = breadcrumbsService.subscribe((items) => {
      this.renderItems(items);
    });

    this.shadowRoot?.addEventListener("click", this.onRootClick);
  }

  disconnectedCallback(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.shadowRoot?.removeEventListener("click", this.onRootClick);
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));
    this.listEl = this.shadowRoot.querySelector(".breadcrumbs-list");
  }

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const link = target.closest(".crumb-link") as HTMLElement | null;
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute("data-href");
    if (href) {
      router.navigate(href);
    }
  };

  private resolveHref(item: BreadcrumbItem): string {
    if (item.id === "root" || item.id === "/") return "/";
    if (item.id === "settings" || item.id === "admin" || item.id === "news") {
      return `/${item.id}`;
    }
    return `/desk/${item.id}`;
  }

  private renderItems(items: BreadcrumbItem[]): void {
    if (!this.listEl) return;

    if (!items || items.length === 0) {
      this.listEl.innerHTML = "";
      return;
    }

    const htmlParts: string[] = [];

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const safeTitle = this.escapeHtml(item.title || "Без названия");

      if (isLast) {
        htmlParts.push(`
          <span class="crumb-item">
            ${index > 0 ? SEPARATOR_SVG : ""}
            <span class="crumb-current" title="${safeTitle}" aria-current="page">${safeTitle}</span>
          </span>
        `);
      } else {
        const href = this.resolveHref(item);
        htmlParts.push(`
          <span class="crumb-item">
            ${index > 0 ? SEPARATOR_SVG : ""}
            <a class="crumb-link" href="${href}" data-href="${href}" title="${safeTitle}">${safeTitle}</a>
          </span>
        `);
      }
    });

    this.listEl.innerHTML = htmlParts.join("");
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
