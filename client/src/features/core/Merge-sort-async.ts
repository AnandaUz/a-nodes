/**
 * Асинхронная сортировка слиянием для сравнений, которые делает пользователь.
 *
 * Идея: обычная merge sort, но вместо compare(a, b) => number
 * используется compareAsync(a, b) => Promise<number>, который
 * "зависает" до тех пор, пока пользователь не кликнет на один из двух
 * вариантов (< 0 если a должно идти раньше b, > 0 если b раньше a).
 */

/**
 * Функция сравнения, возвращает Promise, который резолвится:
 * - отрицательным числом, если a < b (a должен идти раньше)
 * - положительным числом, если a > b (b должен идти раньше)
 */
export type CompareAsync<T> = (a: T, b: T) => Promise<number>;

/**
 * @param array - массив для сортировки
 * @param compareAsync - функция сравнения (см. тип CompareAsync)
 * @returns отсортированный массив
 */
export async function mergeSortAsync<T>(
  array: T[],
  compareAsync: CompareAsync<T>,
): Promise<T[]> {
  // Базовый случай рекурсии: массив из 0 или 1 элемента уже "отсортирован"
  if (array.length <= 1) {
    return array;
  }

  const middle = Math.floor(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);

  // Рекурсивно сортируем обе половины.
  // Важно: строго последовательно (не Promise.all!), иначе одновременно
  // возникнут два разных сравнения, ожидающих ответ пользователя,
  // а по условию задачи пользователь видит только одну пару за раз.
  const sortedLeft = await mergeSortAsync(left, compareAsync);
  const sortedRight = await mergeSortAsync(right, compareAsync);

  // Сливаем две отсортированные половины в одну, спрашивая пользователя
  return mergeAsync(sortedLeft, sortedRight, compareAsync);
}

/**
 * Слияние двух уже отсортированных массивов в один отсортированный,
 * с запросом сравнения у пользователя на каждом шаге.
 */
export async function mergeAsync<T>(
  left: T[],
  right: T[],
  compareAsync: CompareAsync<T>,
): Promise<T[]> {
  // Копии-очереди: shift() убирает и возвращает первый элемент,
  // одновременно сокращая массив — так TS видит, что после успешной
  // проверки length > 0 первый элемент точно есть, без ложных
  // срабатываний noUncheckedIndexedAccess на T | undefined.
  const leftQueue = [...left];
  const rightQueue = [...right];
  const result: T[] = [];

  while (leftQueue.length > 0 && rightQueue.length > 0) {
    // Non-null assertion безопасен: длина только что проверена выше
    const a = leftQueue[0]!;
    const b = rightQueue[0]!;
    const cmp = await compareAsync(a, b);
    if (cmp <= 0) {
      result.push(leftQueue.shift()!);
    } else {
      result.push(rightQueue.shift()!);
    }
  }

  // Дописываем "хвост" — то, что осталось несравненным.
  // Важно: эти элементы уже отсортированы внутри своей половины,
  // поэтому сравнивать их друг с другом не нужно — экономим вопросы.
  result.push(...leftQueue, ...rightQueue);

  return result;
}
type Choice = "a" | "b";

export function createUserCompare<T>(
  renderPairToUser: (a: T, b: T, onChoice: (choice: Choice) => void) => void,
): CompareAsync<T> {
  return function compareAsync(a: T, b: T): Promise<number> {
    return new Promise((resolve) => {
      // renderPairToUser должен показать (a, b) и вызвать onChoice,
      // когда пользователь кликнет на один из двух вариантов
      renderPairToUser(a, b, (choice) => {
        // choice === 'a' -> a должно идти раньше (a < b) -> resolve(-1)
        // choice === 'b' -> b должно идти раньше (b < a) -> resolve(1)
        resolve(choice === "a" ? -1 : 1);
      });
    });
  };
}
