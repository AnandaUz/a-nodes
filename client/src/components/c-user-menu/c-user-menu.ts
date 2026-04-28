import { getUser } from "@/services/auth.service";
import "./c-user-menu.scss";
class CUserMenu extends HTMLElement {
    
 

  connectedCallback() {

    const user = getUser();
    const content = this.innerHTML;


    const str =`
<div class="avatar-wrap" id="avatarWrap" tabindex="0">
    <div class="avatar">
        ${user?.picture
            ? `<img class="header-avatar" src="${user.picture}" alt="${user.name}" />`
            : ''
        }
    </div>
    <div class="dropdown">
      ${content}
      <div class="dropdown-divider"></div>
      <a id="logout-btn" href="#">выйти</a>
    </div>
  </div>
    `

    this.innerHTML = str;

    const wrap = document.getElementById('avatarWrap');

    if (wrap) {
      // клик на аватарке — переключает меню
      wrap.addEventListener('click', function (e) {
        e.stopPropagation(); // не даём клику всплыть до document
        wrap.classList.toggle('open');
      });
 
      // клик в любом другом месте — закрывает меню
      document.addEventListener('click', function () {
        wrap.classList.remove('open');
      });
 
      // ESC тоже закрывает
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') wrap.classList.remove('open');
      });

    };
 
    
  }
}

customElements.define('c-user-menu', CUserMenu);