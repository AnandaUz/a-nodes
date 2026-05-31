import { DeskStore } from "@/features/core/store";
import { NodeRenderer } from "@features/nodes/node-renderer";
import Tools from "../core/Tools";

export class TextEditor {
  private store: DeskStore;
  private renderer: NodeRenderer;

  private editingId: string | null = null;

  constructor(store: DeskStore, renderer: NodeRenderer) {
    this.store = store;
    this.renderer = renderer;
  }

  bind(container: HTMLElement, scene: HTMLElement) {
    // Двойной клик по ноде — входим в режим редактирования
    container.addEventListener("dblclick", this.onDblClick);

    // Клик вне ноды — сохраняем и выходим
    scene.addEventListener("pointerdown", this.onScenePointerDown);

    // Escape — выходим без потери текста
    window.addEventListener("keydown", this.onKeyDown);
  }

  unbind(container: HTMLElement, scene: HTMLElement) {
    container.removeEventListener("dblclick", this.onDblClick);
    scene.removeEventListener("pointerdown", this.onScenePointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  // ─── Вход в режим редактирования ─────────────────────────────

  private onDblClick = (e: MouseEvent) => {
    const nodeEl = (e.target as HTMLElement).closest<HTMLElement>(".desk-node");
    if (!nodeEl) return;

    const id = nodeEl.dataset["nodeId"];
    if (!id) return;

    Tools.stopEvent(e); // не создаём новую ноду
    this.startEditing(id);
  };

  startEditing(id: string) {
    if (this.editingId === id) return;

    // Сохраняем предыдущую если была
    if (this.editingId) this.stopEditing();

    const el = this.renderer.getElement(id);
    if (!el) return;

    const node = this.store.getNode(id);
    if (!node) return;

    this.editingId = id;

    const textEl = el.querySelector<HTMLElement>(".desk-node__text");
    if (!textEl) return;

    // Включаем редактирование
    textEl.contentEditable = "true";
    textEl.style.pointerEvents = "auto";
    el.classList.add("is-editing");
    el.classList.remove("is-selected");

    // Фокус и курсор в конец текста
    textEl.focus();
    this.moveCursorToEnd(textEl);
  }

  // ─── Выход из режима редактирования ──────────────────────────

  private onScenePointerDown = (e: PointerEvent) => {
    if (!this.editingId) return;

    const nodeEl = (e.target as HTMLElement).closest<HTMLElement>(".desk-node");

    // Кликнули по той же ноде — продолжаем редактировать
    if (nodeEl?.dataset["nodeId"] === this.editingId) return;

    this.stopEditing();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.editingId) return;

    if (e.key === "Escape") {
      this.stopEditing();
    }

    // Ctrl+Enter или Cmd+Enter — тоже выходим
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.stopEditing();
    }
  };

  stopEditing() {
    if (!this.editingId) return;

    const id = this.editingId;
    this.editingId = null;

    const el = this.renderer.getElement(id);
    if (!el) return;

    const textEl = el.querySelector<HTMLElement>(".desk-node__text");
    if (!textEl) return;

    // Сохраняем текст в store
    const text = textEl.innerText.trim();
    this.store.updateNodeText(id, text);

    // Выключаем редактирование
    textEl.contentEditable = "false";
    textEl.style.pointerEvents = "";
    el.classList.remove("is-editing");
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private moveCursorToEnd(el: HTMLElement) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false); // false = в конец
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  isEditing(): boolean {
    return this.editingId !== null;
  }
}
