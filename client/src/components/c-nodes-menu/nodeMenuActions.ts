import { core } from "@/features/core/core";
import type { LNode } from "@/features/nodes/LNode/LNode";

export function updateSelectedNodesEx(
  mutator: (node: LNode) => void,
  options: { updateChildrenPosition?: boolean; renderVNode?: boolean } = {},
) {
  core.selectManager.selectedNodes.forEach((node) => {
    if (!node.exData) {
      node.exData = {};
    }
    mutator(node);
    node.save();
    if (options.renderVNode !== false) {
      node.vNode?.render();
    }
    if (options.updateChildrenPosition) {
      const mainP = node.list.mainParent || node;
      mainP.list.setPositionForChildren();
    }
  });
}

export function clearSelectedNodesRepeat() {
  const selectedList = [...core.selectManager.selectedNodes];
  selectedList.forEach((node) => {
    node.clones.doForAll((clone) => {
      clone.repeatMode.mode = 0;
      clone.repeatMode.date = null;
      clone.save();
      clone.show();
      clone.vNode?.render();
    });
    node.repeatMode.mode = 0;
    node.repeatMode.date = null;
    node.save();
    node.show();
    node.vNode?.render();
  });
}

export function setSelectedNodesRepeatDate(repeatDay: Date | null) {
  core.selectManager.selectedNodes.forEach((node) => {
    node.clones.doForAll((clone) => {
      if (clone === node) return;
      clone.repeatMode.date = repeatDay;
      clone.save();
    });
    node.repeatMode.date = repeatDay;
    node.save();
    node.vNode?.render();
  });
}

export function toggleSelectedNodesRepeatDay(dayIndex: number): boolean {
  let isToggledOn = true;
  core.selectManager.selectedNodes.forEach((node) => {
    let modeValue = 0;
    if (node.repeatMode.mode === dayIndex) {
      isToggledOn = false;
    } else {
      modeValue = dayIndex;
    }
    node.repeatMode.mode = modeValue;
    node.clones.doForAll((clone) => {
      clone.repeatMode.mode = modeValue;
      clone.save();
    });
    node.save();
  });
  return isToggledOn;
}

export function setSelectedNodesRepeatDelay(delay: number) {
  const selectedList = [...core.selectManager.selectedNodes];
  selectedList.forEach((node) => {
    node.clones.doForAll((clone) => {
      if (clone === node) return;
      clone.repeatMode.setDelay(delay);
      clone.save();
    });
    node.repeatMode.setDelay(delay);
    node.save();
    node.vNode?.render();
  });
}

export function calcDayDelay(targetDay: number, fromDate: Date = new Date()): number {
  const nowDay = fromDate.getDay();
  return nowDay < targetDay ? targetDay - nowDay : 7 - (nowDay - targetDay);
}
