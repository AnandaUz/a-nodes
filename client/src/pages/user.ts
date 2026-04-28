import { getUsers } from '@/services/users.service';
import type { Page } from '../types';


export const userPage: Page = ({ id }) => {
  return {
    html: `<section id="user-page">Загрузка...</section>`,
    async init() {
      const users = await getUsers(); // из кэша, без запроса
      const user = users.find(u => u.id === id);

      const section = document.getElementById('user-page');
      if (!section) return;

      if (!user) {
        section.innerHTML = `<h1>Пользователь не найден</h1>`;
        return;
      }

      section.innerHTML = `
        <h1>${user.name}</h1>
        <p>${user.email ?? ''}</p>
      `;
    }
  };
}