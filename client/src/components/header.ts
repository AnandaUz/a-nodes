import { getToken, getUser, logout } from "@/services/auth.service";
import "@components/c-user-menu/c-user-menu";

export function renderHeader(): void {
  const header = document.querySelector("#header");
  if (!header) return;

  const isAuth = !!getToken();
  const user = getUser();

  const path = window.location.pathname;

  header.innerHTML = `
    <nav>
      <div class="logo-bl">
        ${path !== "/" ? `<a href="/" class="logo"></a>` : ""}
      </div>
      
      ${
        isAuth
          ? `            
          <div class="right-bl">
            
            <c-user-menu>
              ${user?.isAdmin ? `<a href="/admin">админка</a>` : ""}
              <a href="/settings" class="btn-settings"></a>
              <a href="/news">новости</a>
              
            </c-user-menu>
          </div>
        `
          : ""
      }
    </nav>
  `;
  header.querySelector("#logout-btn")?.addEventListener("click", () => {
    logout();
  });
  // подсвечивает текущую страницу
  const links = header.querySelectorAll("a");
  links.forEach((link) => {
    if (link.getAttribute("href") === window.location.pathname) {
      link.classList.add("active");
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:login", () => renderHeader());
  window.addEventListener("auth:logout", () => renderHeader());
}
