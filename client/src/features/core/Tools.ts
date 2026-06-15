export default {
  stopEvent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  },
  getCursorIndex(container: HTMLElement, range: Range): number {
    let index = 0;
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

    let node = walk.nextNode();
    while (node) {
      if (node === range.startContainer) {
        index += range.startOffset;
        break;
      }
      index += (node.textContent?.length ?? 0) + 1; // +1 за перенос строки
      node = walk.nextNode();
    }
    return index;
  },
  getNextWeekday(dayOfWeek: number): Date {
    // 0 = пн, 1 = вт, 2 = ср, 3 = чт, 4 = пт, 5 = сб, 6 = вс
    const today = new Date();
    const current = (today.getDay() + 6) % 7; // конвертируем JS (вс=0) в (пн=0)
    const diff = (dayOfWeek - current + 7) % 7 || 7;
    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    return result;
  },
  formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
  },
  parseDate(str: string | undefined): Date | null {
    if (!str) return null;
    const parts = str.split(".");
    const day = parseInt(parts[0] ?? str);
    const month = parts[1] ? parseInt(parts[1]) - 1 : new Date().getMonth();
    const year = parts[2]
      ? parseInt(parts[2]) < 100
        ? 2000 + parseInt(parts[2])
        : parseInt(parts[2])
      : new Date().getFullYear();

    return new Date(year, month, day);
  },
};
