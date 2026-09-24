import type { INode } from "./INode";
import type { INodeDB } from "./INodeDB";

export function toDB(node: INode): INodeDB {
  // упаковываем данные в одну переменную listData
  let L: number | undefined = undefined;
  if (node.listData) {
    const parentLID = node.listData.parentLID ?? 0;
    const index = node.listData.index ?? 0;
    L = ((parentLID & 0x1ffff) << 12) | (index & 0xfff);
  }
  // упаковка - s - разные переменные
  let s: number | undefined = undefined;
  if (node.lID) {
    // упаковываем данные в одну переменную listData
    const lID = node.lID ?? 0;
    s = lID & 0x1ffff;
  }
  let exData: INodeDB["exData"] = undefined;
  if (node.exData) {
    exData = {
      ownerNodesIds: node.exData.ownerNodesIds ?? undefined,
      bgColor: node.exData.bgColor ?? undefined,
      tColor: node.exData.tColor ?? undefined,
      repeatMode: node.exData.repeatMode ?? undefined,
      repeatDay: node.exData.repeatDay ?? undefined,
      url: node.exData.url ?? undefined,
      h: node.exData.h ?? undefined,
      hh: node.exData.hh ?? undefined,
    };
  }

  return {
    _id: node._id,
    userId: node.userId,
    pageId: node.pageId,
    inTrash: node.inTrash,
    lastUpdate: node.lastUpdate,
    type: node.type,
    x: node.x,
    y: node.y,
    title: node.title,
    ok: node.ok,
    //- exData
    L, // listData
    s, // другие переменные

    exData,
  };
}

export function fromDB(db: INodeDB): INode {
  const res: INode = {
    _id: db._id,
    userId: db.userId,
    pageId: db.pageId,
    inTrash: db.inTrash,
    lastUpdate: db.lastUpdate,
    type: db.type,
    x: db.x,
    y: db.y,
    title: db.title,
    ok: db.ok,
    listData: db.L
      ? {
          parentLID: (db.L >> 12) & 0x1ffff,
          index: db.L & 0xfff,
        }
      : undefined,
    exData: db.exData
      ? {
          ownerNodesIds: db.exData.ownerNodesIds,
          bgColor: db.exData.bgColor,
          tColor: db.exData.tColor,
          repeatMode: db.exData.repeatMode,
          repeatDay: db.exData.repeatDay,
          url: db.exData.url,
          h: db.exData.h,
          hh: db.exData.hh,
        }
      : undefined,
  };

  if (db.s) {
    res.lID = db.s & 0x1ffff;
  }

  return res;
}
