import { getUser } from "@/services/auth.service";
import "./c-user-menu.scss";
import Tools from "@/features/core/Tools";
class CUserMenu extends HTMLElement {
  connectedCallback() {
    const user = getUser();
    const content = this.innerHTML;

    const str = `
<div class="avatar-wrap" id="avatarWrap" tabindex="0">
    <div class="avatar">
        ${
          user?.picture
            ? `<img class="header-avatar" src="${user.picture}" alt="${user.name}" referrerpolicy="no-referrer" />`
            : `${user?.name ? user.name.charAt(0).toUpperCase() : ""}`
        }
    </div>
    <div class="dropdown">
      ${content}
      <div class="dropdown-divider"></div>
      <a id="logout-btn" href="#">выйти</a>
    </div>
  </div>
    `;

    this.innerHTML = str;

    const wrap = this.querySelector(".avatar-wrap") as HTMLElement | null;
    const avatar = this.querySelector(".avatar") as HTMLElement | null;
    const dropdown = this.querySelector(".dropdown") as HTMLElement | null;

    if (wrap && avatar) {
      // клик строго на аватарке — переключает меню
      avatar.addEventListener("click", function (e) {
        Tools.stopEvent(e);
        wrap.classList.toggle("open");
      });

      // клик по пунктам меню закрывает его, не ломая навигацию
      dropdown?.addEventListener("click", function (e) {
        const target = e.target as HTMLElement;
        if (target.closest("a")) {
          wrap.classList.remove("open");
        }
      });

      // клик в любом другом месте — закрывает меню
      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target as Node)) {
          wrap.classList.remove("open");
        }
      });

      // ESC тоже закрывает
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") wrap.classList.remove("open");
      });
    }
  }
}

customElements.define("c-user-menu", CUserMenu);
