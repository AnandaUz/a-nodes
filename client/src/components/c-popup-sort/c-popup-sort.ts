import { CPopup } from "@components/c-popup/c-popup";
import "./c-popup-sort.scss";
import html from "./c-popup-sort.html?raw";
import {
  mergeSortAsync,
  type CompareAsync,
} from "@/features/core/Merge-sort-async";

export class CPopupSort extends CPopup {
  q1El!: HTMLElement;
  q2El!: HTMLElement;
  func: ((n: number) => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.classList.add("c-popup-sort");

    this.innerHTML = html;
    this.q1El = this.querySelector(".q1") as HTMLElement;
    this.q2El = this.querySelector(".q2") as HTMLElement;
    this.q1El.addEventListener("click", () => {
      this.func?.(1);
    });
    this.q2El?.addEventListener("click", () => {
      this.func?.(2);
    });
  }
  setQuestion(q1: string, q2: string) {
    this.q1El.innerText = q1;
    this.q2El.innerText = q2;
  }
  setAction(func: (n: number) => void) {
    this.func = func;
  }
  async start(ss: { value: string; index: number }[]) {
    super.toggle();

    let questionsAsked = 0;

    // Реальное сравнение через попап: показываем пару чисел как вопрос
    // и "замораживаем" промис до тех пор, пока пользователь не нажмёт
    // один из двух вариантов внутри core.popupAsk.
    const popupCompareAsync: CompareAsync<{ value: string; index: number }> = (
      a,
      b,
    ) => {
      questionsAsked++;

      return new Promise((resolve) => {
        this.setQuestion(String(a.value), String(b.value));

        // setAction перезаписывается на каждое сравнение — это ок,
        // т.к. предыдущий resolve уже отработал к этому моменту.
        this.setAction((n) => {
          // n === 1 -> выбран первый вариант (a) -> a раньше -> -1
          // n === 2 -> выбран второй вариант (b) -> b раньше -> 1
          resolve(n === 1 ? -1 : 1);
        });
      });
    };
    const sorted = await mergeSortAsync(ss, popupCompareAsync);
    console.log("Отсортировано:", sorted, "вопросов задано:", questionsAsked);
    this.close();
    return sorted;
  }
}

customElements.define("c-popup-sort", CPopupSort);
