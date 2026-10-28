export function setCaretFromPoint(x: number, y: number): void {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const range = doc.caretPositionFromPoint
    ? (() => {
        const pos = doc.caretPositionFromPoint(x, y);
        if (!pos) return null;
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
        return r;
      })()
    : doc.caretRangeFromPoint
      ? doc.caretRangeFromPoint(x, y)
      : null;

  if (range) {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}
