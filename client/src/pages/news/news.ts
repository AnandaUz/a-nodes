import "@components/c-news";
import html from "@pages/news/news.html?raw";
import "./news.scss";
import { core } from "@/features/core/core";
import {
  mergeSortAsync,
  type CompareAsync,
} from "@/features/core/Merge-sort-async";

export function newsPage() {
  return {
    html,
    async init() {
      const but = document.getElementById("bt-click");

      const m: number[] = [];
      for (let i = 0; i < 5; i++) {
        m.push(Math.round(Math.random() * 100));
      }

      let questionsAsked = 0;

      // Реальное сравнение через попап: показываем пару чисел как вопрос
      // и "замораживаем" промис до тех пор, пока пользователь не нажмёт
      // один из двух вариантов внутри core.popupAsk.
      const popupCompareAsync: CompareAsync<number> = (a, b) => {
        questionsAsked++;

        return new Promise((resolve) => {
          //
          core.popupSort.setQuestion(String(a), String(b));

          // setAction перезаписывается на каждое сравнение — это ок,
          // т.к. предыдущий resolve уже отработал к этому моменту.
          core.popupSort.setAction((n) => {
            // n === 1 -> выбран первый вариант (a) -> a раньше -> -1
            // n === 2 -> выбран второй вариант (b) -> b раньше -> 1
            resolve(n === 1 ? -1 : 1);
          });
        });
      };

      but?.addEventListener("click", async () => {
        // Сортировка стартует по клику, а не сразу при init()
        core.popupSort.toggle();
        const sorted = await mergeSortAsync(m, popupCompareAsync);
        console.log(
          "Отсортировано:",
          sorted,
          "вопросов задано:",
          questionsAsked,
        );
      });
    },
  };
}
