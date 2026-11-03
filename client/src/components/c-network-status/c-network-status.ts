import "./c-network-status.scss";

export class CNetworkStatus extends HTMLElement {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isOffline = false;

  connectedCallback() {
    this.classList.add("c-network-status");
    this.innerHTML = `
      <div class="c-network-status__content">
        <span class="c-network-status__icon"></span>
        <span class="c-network-status__text"></span>
      </div>
    `;

    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("connection:offline", this.handleOffline);
    window.addEventListener("connection:online", this.handleOnline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.handleOffline();
    }
  }

  disconnectedCallback() {
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("connection:offline", this.handleOffline);
    window.removeEventListener("connection:online", this.handleOnline);
  }

  private handleOffline = () => {
    this.isOffline = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.updateStatus("offline", "Соединение отсутствует");
  };

  private handleOnline = () => {
    if (!this.isOffline) return;
    this.isOffline = false;
    this.updateStatus("online", "Соединение восстановлено");

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.classList.remove("is-visible");
      this.timer = null;
    }, 2500);
  };

  private updateStatus(status: "offline" | "online", message: string) {
    const iconEl = this.querySelector(".c-network-status__icon");
    const textEl = this.querySelector(".c-network-status__text");

    this.classList.remove("status-offline", "status-online");
    this.classList.add(`status-${status}`, "is-visible");

    if (textEl) {
      textEl.textContent = message;
    }

    if (iconEl) {
      iconEl.innerHTML =
        status === "offline"
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>`;
    }
  }
}

customElements.define("c-network-status", CNetworkStatus);

