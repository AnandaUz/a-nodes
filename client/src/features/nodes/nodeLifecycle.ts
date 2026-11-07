import { core } from "../core/core";
import type { NodeManager } from "./NodeManager";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";

export function reInitAllNodes(manager: NodeManager): void {
  console.time("Перерендер всех нод страницы");
  core.desk.disconnectNodesEl();
  core.nodeRenderer.renderAll();
  core.desk.connectNodesEl();

  const checkLID = new Set<number>();
  manager.nodes.forEach((node) => {
    if (node.isLockedInOutFrame) return;
    if (!node.lID) return;
    if (!checkLID.has(node.lID)) {
      checkLID.add(node.lID);
    } else {
      console.log("дубль LID", node.title);
      node.lID = manager.generateLID();
      manager.registerNode(node);
      node.save();
    }
  });

  manager.nodes.forEach((node) => {
    node.repeatMode.refreshIndicator();
  });

  const frames = [...manager.nodes.values()].filter(
    (node: any) => node?.frame?.isFrame,
  ) as LNode_TextEdit[];

  frames.forEach((node) => {
    node.frame.init();
  });
  frames.forEach((node) => {
    node.frame.initBtns();
  });
  frames.forEach((node) => {
    node.frame.setBtnsState();
  });

  manager.nodes.forEach((node) => {
    node.vNode?.prepareMeasure();
  });
  manager.nodes.forEach((node) => {
    node.vNode?.readMeasure();
  });

  manager.nodes.forEach((node) => {
    if (node.type === 4) {
      (node as any).checkOutNodesMode?.();
    }
  });

  manager.setPositionForAllLinkedChildNodes();
  manager.nodes.forEach((node) => {
    node.vNode?.renderSVG();
  });

  frames.forEach((node) => {
    node.frame.bringToFront();
  });

  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready.then(() => {
      manager.setPositionForAllLinkedChildNodes();
      manager.nodes.forEach((node) => {
        node.vNode?.renderSVG();
      });
    });
  }

  console.timeEnd("Перерендер всех нод страницы");
}

