import { core } from "@/features/core/core";
import type { LNode } from "../LNode/LNode";
import type VTextEdit from "./VTextEdit";

export function restoreSubtreeVisibility(parent: LNode): void {
  if (!parent.list.children?.size) return;
  const parentList = parent.list;
  parentList.children?.forEach((child) => {
    const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
    const isHidden = child.hiddenBD && !isRepeat;

    let shouldShow = true;
    if (isRepeat && !parentList.isRepeatsOpen) {
      shouldShow = false;
    } else if (isHidden && !parentList.isHiddenOpen) {
      shouldShow = false;
    }

    if (shouldShow) {
      child.hidden = false;
      if (!child.vNode && core.nodeRenderer) {
        core.nodeRenderer.createVNode(child);
      } else {
        child.vNode?.show();
      }
      if (child.list.isListOpen) {
        restoreSubtreeVisibility(child);
      }
    } else {
      child.hidden = true;
      child.vNode?.hide();
    }
  });
}

function updateLayoutAfterVisibilityToggle(node: LNode, view: VTextEdit): void {
  const mainParent = node.list.mainParent || node;
  mainParent.list.setPositionForChildren();
  mainParent.vNode?.renderSVG();
  const frameNode = mainParent as unknown as {
    frame?: { isFrame: boolean; initBtns(): void; setBtnsState(): void; bringToFront(): void };
  };
  if (frameNode.frame?.isFrame) {
    frameNode.frame.initBtns();
    frameNode.frame.setBtnsState();
    frameNode.frame.bringToFront();
  }
  view.refreshListBtns();
  node.save();
}

export function toggleListOpen(view: VTextEdit): void {
  const list = view.node.list;
  list.isListOpen = !list.isListOpen;
  if (!list.isListOpen) {
    list.forEachChildren((child) => {
      child.hidden = true;
      child.vNode?.hide();
    });
  } else {
    restoreSubtreeVisibility(view.node);
  }

  updateLayoutAfterVisibilityToggle(view.node, view);
}

export function toggleRepeatsOpen(view: VTextEdit): void {
  const list = view.node.list;
  list.isRepeatsOpen = !list.isRepeatsOpen;

  if (list.isRepeatsOpen) {
    if (!list.isListOpen) {
      list.isListOpen = true;
    }
    list.children?.forEach((child) => {
      if (child.repeatMode.mode > 0 || !!child.repeatMode.date) {
        child.hidden = false;
        if (!child.vNode && core.nodeRenderer) {
          core.nodeRenderer.createVNode(child);
        } else {
          child.vNode?.show();
        }
        if (child.list.isListOpen) {
          restoreSubtreeVisibility(child);
        }
      }
    });
  } else {
    list.children?.forEach((child) => {
      if (child.repeatMode.mode > 0 || !!child.repeatMode.date) {
        child.hidden = true;
        child.vNode?.hide();
        child.list.forEachChildren((grandChild) => {
          grandChild.hidden = true;
          grandChild.vNode?.hide();
        });
      }
    });
  }

  updateLayoutAfterVisibilityToggle(view.node, view);
}

export function toggleHiddenOpen(view: VTextEdit): void {
  const list = view.node.list;
  list.isHiddenOpen = !list.isHiddenOpen;

  if (list.isHiddenOpen) {
    if (!list.isListOpen) {
      list.isListOpen = true;
    }
    list.children?.forEach((child) => {
      const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
      if (child.hiddenBD && !isRepeat) {
        child.hidden = false;
        if (!child.vNode && core.nodeRenderer) {
          core.nodeRenderer.createVNode(child);
        } else {
          child.vNode?.show();
        }
        if (child.list.isListOpen) {
          restoreSubtreeVisibility(child);
        }
      }
    });
  } else {
    list.children?.forEach((child) => {
      const isRepeat = child.repeatMode.mode > 0 || !!child.repeatMode.date;
      if (child.hiddenBD && !isRepeat) {
        child.hidden = true;
        child.vNode?.hide();
        child.list.forEachChildren((grandChild) => {
          grandChild.hidden = true;
          grandChild.vNode?.hide();
        });
      }
    });
  }

  updateLayoutAfterVisibilityToggle(view.node, view);
}

export function refreshListBtns(view: VTextEdit): void {
  if (!view.elListBtns) return;
  const list = view.node.list;
  if (!list.hasChildren) {
    view.elListBtns.style.display = "none";
    return;
  }

  view.elListBtns.style.display = "flex";

  // 1. Серый индикатор (btn-open)
  if (view.btnOpen) {
    const hasSimple = list.hasSimpleChildren();
    if (!hasSimple) {
      view.btnOpen.style.display = "none";
    } else {
      view.btnOpen.style.display = "";
      if (list.isListOpen) {
        view.btnOpen.classList.add("open");
      } else {
        view.btnOpen.classList.remove("open");
      }
    }
  }

  // 2. Оранжевый индикатор (btn-repeats)
  if (view.btnRepeats) {
    const hasRepeats = list.hasRepeatChildren();
    if (!hasRepeats) {
      view.btnRepeats.style.display = "none";
    } else {
      view.btnRepeats.style.display = "";
      if (list.isRepeatsOpen) {
        view.btnRepeats.classList.add("open");
      } else {
        view.btnRepeats.classList.remove("open");
      }
    }
  }

  // 3. Синий индикатор (btn-hidden)
  if (view.btnHidden) {
    const hasHidden = list.hasHiddenChildren();
    if (!hasHidden) {
      view.btnHidden.style.display = "none";
    } else {
      view.btnHidden.style.display = "";
      if (list.isHiddenOpen) {
        view.btnHidden.classList.add("open");
      } else {
        view.btnHidden.classList.remove("open");
      }
    }
  }
}
