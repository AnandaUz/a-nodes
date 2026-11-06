import { getToken, getUser, logout } from "@/services/auth.service";
import "@components/c-user-menu/c-user-menu";
import "@components/c-breadcrumbs";

export function renderHeader(): void {
  const header = document.querySelector("#header");
  if (!header) return;

  const isAuth = !!getToken();
  const user = getUser();

  header.innerHTML = `
    <nav>
      <div class="logo-bl">
        <a href="/" class="logo" title="На главную"></a>
        <c-breadcrumbs></c-breadcrumbs>
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
