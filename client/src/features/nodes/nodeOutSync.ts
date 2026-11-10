import {
  toDB,
  type IOutFrameData,
  type IOutNodeItem,
} from "@shared/types/INodeDB";
import type { LNode_TextEdit } from "./LNode/LNode_TextEdit";
import type { NodeManager } from "./NodeManager";

/**
 * @contract
 *   Предусловия: manager.pageNode инициализирована на канвасе.
 *   Постусловия: синхронизирует слепок данных out-фреймов (out[]) на странице с текущим графом.
 */
export function syncCurrentPageOutData(manager: NodeManager): void {
  if (!manager.pageNode) return;
  const outFrames = [...manager.nodes.values()]
    .filter(
      (n) =>
        !n.inTrash &&
        !n.isLockedInOutFrame &&
        (n as LNode_TextEdit).frame?.isFrame &&
        (n as LNode_TextEdit).frame?.isFrameOut,
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const nextOut: IOutFrameData[] = [];
  for (const frame of outFrames) {
    manager.ensureLID(frame);
    if (!frame.lID) continue;
    const items: IOutNodeItem[] = [];
    frame.list.forEachChildren((ch) => {
      if (ch.inTrash || ch.hiddenBD) return;
      manager.ensureLID(ch);
      const dbCh = toDB(ch);
      items.push({
        _id: ch._id || undefined,
        lID: ch.lID || 0,
        parentLID: ch.list.parentNode?.lID || frame.lID || 0,
        t: ch.title || "",
        tab: ch.list.tab || 1,
        index: ch.list.index || 0,
        c: dbCh.c,
        s: dbCh.s,
        D: dbCh.D,
      });
    });
    nextOut.push({
      _id: frame._id || undefined,
      lID: frame.lID,
      t: frame.title || "",
      items,
    });
  }

  if (JSON.stringify(manager.pageNode.out ?? []) !== JSON.stringify(nextOut)) {
    manager.pageNode.out = nextOut;
    manager.pageNode.save();
  }
}

