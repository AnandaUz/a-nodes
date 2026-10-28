import { getUser } from "@/services/auth.service";
import api from "@/features/core/api";
import "./admin.scss";

interface AdminUserStat {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  createdAt: string;
  lastActiveAt: string;
  pageViewsCount: number;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function adminPage() {
  const user = getUser();
  const isAdmin = Boolean(user?.isAdmin);

  if (!isAdmin) {
    return {
      html: `
        <div class="admin-page">
          <div class="admin-error">
            <h2>Доступ ограничен</h2>
            <p>У вас нет прав для просмотра этой страницы.</p>
          </div>
        </div>
      `,
      init() {},
    };
  }

  return {
    html: `
      <div class="admin-page">
        <div class="admin-header">
          <div>
            <h1>Статистика пользователей</h1>
            <span id="users-count" style="font-size: 13px; color: #57606a;"></span>
          </div>
          <div class="admin-actions">
            <input type="text" id="admin-search-input" class="admin-search" placeholder="Поиск по имени или email..." />
            <button id="admin-refresh-btn" class="btn-refresh">Обновить</button>
          </div>
        </div>

        <div id="admin-content">
          <div class="admin-loading">Загрузка данных...</div>
        </div>
      </div>
    `,
    async init() {
      const contentEl = document.getElementById("admin-content");
      const countEl = document.getElementById("users-count");
      const searchInput = document.getElementById("admin-search-input") as HTMLInputElement | null;
      const refreshBtn = document.getElementById("admin-refresh-btn") as HTMLButtonElement | null;

      let allUsers: AdminUserStat[] = [];

      function renderTable(users: AdminUserStat[]) {
        if (!contentEl) return;

        if (countEl) {
          countEl.textContent = `Всего пользователей: ${allUsers.length}`;
        }

        if (users.length === 0) {
          contentEl.innerHTML = `<div class="admin-empty">Пользователи не найдены</div>`;
          return;
        }

        const rows = users
          .map((u) => {
            const avatarHtml = u.picture
              ? `<img class="user-avatar" src="${escapeHtml(u.picture)}" alt="" referrerpolicy="no-referrer" />`
              : `<div class="user-avatar">${escapeHtml(u.name ? u.name.charAt(0).toUpperCase() : "?")}</div>`;

            return `
              <tr>
                <td>
                  <div class="user-cell">
                    ${avatarHtml}
                    <span class="user-name">${escapeHtml(u.name)}</span>
                  </div>
                </td>
                <td>${escapeHtml(u.email || "—")}</td>
                <td class="date-cell">${formatDate(u.lastActiveAt)}</td>
                <td><span class="views-badge">${u.pageViewsCount ?? 1}</span></td>
                <td class="date-cell">${formatDate(u.createdAt)}</td>
              </tr>
            `;
          })
          .join("");

        contentEl.innerHTML = `
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Последний заход</th>
                  <th>Просмотров страниц</th>
                  <th>Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      }

      async function fetchStats() {
        if (!contentEl) return;
        if (refreshBtn) refreshBtn.disabled = true;

        try {
          const res = await api.fetchWithAuth("/api/users/admin/stats");
          if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
          }
          allUsers = (await res.json()) as AdminUserStat[];

          const query = searchInput?.value.trim().toLowerCase() || "";
          if (query) {
            renderTable(
              allUsers.filter(
                (u) =>
                  u.name.toLowerCase().includes(query) ||
                  (u.email && u.email.toLowerCase().includes(query))
              )
            );
          } else {
            renderTable(allUsers);
          }
        } catch (err: any) {
          contentEl.innerHTML = `<div class="admin-error">Ошибка загрузки: ${escapeHtml(err.message || String(err))}</div>`;
        } finally {
          if (refreshBtn) refreshBtn.disabled = false;
        }
      }

      searchInput?.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          renderTable(allUsers);
          return;
        }
        const filtered = allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            (u.email && u.email.toLowerCase().includes(query))
        );
        renderTable(filtered);
      });

      refreshBtn?.addEventListener("click", () => {
        fetchStats();
      });

      await fetchStats();
    },
  };
}
