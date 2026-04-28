import { getToken,  logout } from "@/services/auth.service";
import "@components/c-user-menu/c-user-menu";
  
export function renderHeader(): void {
  const header = document.querySelector('#header');
  if (!header) return;

  const isAuth = !!getToken();
  

  const path = window.location.pathname;

  header.innerHTML = `
    <nav>
      <div class="logo-bl">
        ${path !== '/' ? `<a href="/" class="logo"></a>` : ''}
      </div>
      
      ${isAuth ? `            
          <div class="right-bl">
            <a href="/settings" class="btn-settings"></a>
            <c-user-menu>
              <a href="/news">новости</a>
              
            </c-user-menu>
          </div>
        ` : ''}
    </nav>
  `;
  header.querySelector('#logout-btn')?.addEventListener('click', () => {
    logout();
  });
  // подсвечивает текущую страницу
  const links = header.querySelectorAll('a');
  links.forEach(link => {
    if (link.getAttribute('href') === window.location.pathname) {
      link.classList.add('active');
    }
  });
}