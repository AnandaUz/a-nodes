import { getUsers } from '../services/users.service';
import type { IUser } from '@shared/types';
import { escapeHtml } from '@/features/core/escapeHtml';

class CUsersList extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `<p>Загрузка...</p>`;

    try {
      const users = await getUsers();
      this.render(users);
    } catch (e) {
      this.innerHTML = `<p>Ошибка загрузки пользователей</p>`;
      console.error(e);
    }
  }

  render(users: IUser[]) {
    this.innerHTML = `
      <ul class="users-list ul-level">
        ${users.map(user => `
          <li class="users-list__item">
            <a href="/user/${encodeURIComponent(user.id)}">${escapeHtml(user.name)}</a>
          </li>
        `).join('')}
      </ul>
    `;
  }
}

customElements.define('c-users-list', CUsersList);