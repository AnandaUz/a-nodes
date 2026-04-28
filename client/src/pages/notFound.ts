import type { Page } from '../types';

export const notFoundPage: Page = () => {
  return {
    html: `
      <section>
        <h1>404</h1>
        <p>Страница не найдена</p>
      </section>
    `,
    init() {

    }
  };
}