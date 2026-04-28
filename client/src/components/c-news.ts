/**
 * Компонент для отображения новостных карточек.
 *
 * @element c-news
 *
 * @attr title - Заголовок новости (h3).
 * @attr date - Дата публикации (отрендерится маленьким шрифтом).
 * @slot body - Основной текст новости.
 */
class CNews extends HTMLElement {
  constructor() {
    super();
    // this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {

    const dateStr = this.getAttribute('date') ?? ''
    const titeleStr = this.getAttribute('title') ?? ''

    // Сохраняем изначальное содержимое элемента (то, что было между <c-news> и </c-news>)
    const content = this.innerHTML;

    this.innerHTML = `
      <section class="c-news">
        <div class="date">${dateStr}</div>
        <h3>${titeleStr}</h3>
        <div class="text">
          ${content}
        </div>
      </section>
    `;
  }
}

customElements.define('c-news', CNews);

declare global {
  interface HTMLElementTagNameMap {
    'c-news': CNews;
  }
}
