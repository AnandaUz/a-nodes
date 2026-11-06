import type { IExData } from "./IExData";
import type { ILNode } from "./ILNode";

export interface INodeDB {
  _id?: string | undefined;
  userId?: string | undefined;
  pageId?: string | undefined;
  inTrash?: boolean | undefined;
  lastUpdate?: Date | undefined;
  type?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
  title?: string | undefined;
  ok?: boolean | undefined;
  L?: number | undefined; //list - разные переменные
  s?: number | undefined; //lID - разные переменные
  A?: number | undefined; //переменные для клонов LNode_TEClone,
  c?: string | undefined; // ID оригинальной ноды для клона (sourceNodeId / clone of)
  exData?: IExData | undefined;
  f?: number[] | null | undefined;
  D?: number | undefined; //переменные для repeatMode и разных дат
  i?: boolean | null | undefined;
  o?: boolean | null | undefined;
  isLockedInOutFrame?: boolean | undefined;
  outFrameLID?: number | undefined;
}
const START_DATE = new Date("2026-10-13T00:00:00.000Z");

const daysFromStartDay = {
  getDate(days: number | undefined): Date | null {
    if (days === undefined) return null;
    return new Date(START_DATE.getTime() + days * 24 * 60 * 60 * 1000);
  },
  getDays(date: Date | undefined | null): number | undefined {
    if (date === null || date === undefined) return undefined;
    return Math.ceil(
      (date.getTime() - START_DATE.getTime()) / (24 * 60 * 60 * 1000),
    );
  },
};

// function daysDiff(d1: Date, d2: Date): number {
//   const msDiff = Math.abs(d1.getTime() - d2.getTime());
//   return Math.round(msDiff / MS_PER_DAY);
// }
class TPackedData<T> {
  private fields: Array<{
    get: (obj: T) => any;
    set: (obj: T, v: any) => void;
    bits: number;
  }> = [];
  // private offsets: number[] = [];
  // private _currentOffset = 0;

  add<OpsT extends boolean | number | Date>(
    accessor: {
      get: (o: T) => OpsT | undefined;
      set: (o: T, v: OpsT) => void;
    },
    bits: number,
  ) {
    this.fields.push({ ...accessor, bits });
    return this;
  }

  pack(obj: T): number | undefined {
    let result = 0;
    let offset = 0;
    let ff = false;
    this.fields.forEach((f) => {
      const mask = (1 << f.bits) - 1;
      const val = f.get(obj) & mask;
      if (val > 0) {
        result |= val << offset;
        ff = true;
      }
      offset += f.bits;
    });
    return ff ? result : undefined;
  }

  unpack(obj: T, packed: number | null | undefined): void {
    if (packed === undefined || packed === null) return;
    let offset = 0;
    this.fields.forEach((f) => {
      const mask = (1 << f.bits) - 1;
      const val = (packed >> offset) & mask;
      if (val > 0 || f.bits === 1) {
        f.set(obj, val);
      }
      offset += f.bits;
    });
  }
}
// переменные для repeatMode и разных дат
const blockD = new TPackedData<ILNode>()
  .add<number>(
    {
      get: (node) => node.repeatMode.mode,
      set: (node, v) => {
        node.repeatMode.mode = v;
      },
    },
    3,
  )
  .add<number>(
    {
      get: (node) => daysFromStartDay.getDays(node.repeatMode.date),
      set: (node, v) => {
        node.repeatMode.date = daysFromStartDay.getDate(v);
      },
    },
    13,
  );
// переменные для клонов LNode_TEClone
const blockA = new TPackedData<ILNode>().add<number>(
  {
    get: (node) => node.clones?.mainNodeLID,
    set: (node, v) => {
      if (node.clones) node.clones.mainNodeLID = v;
    },
  },
  17,
);
// универсальные переменные
const blockS = new TPackedData<ILNode>()
  .add<number>(
    {
      get: (node) => node.lID,
      set: (node, v) => (node.lID = v),
    },
    17,
  )
  .add<boolean>(
    {
      get: (node) => node.frame?.isFrame,
      set: (node, v) => {
        if (node.frame) node.frame.isFrame = Boolean(v);
      },
    },
    1,
  )
  .add<boolean>(
    {
      get: (node) => node.hiddenBD,
      set: (node, v) => {
        node.hiddenBD = Boolean(v);
      },
    },
    1,
  )
  .add<boolean>(
    {
      get: (node) => (node.list ? !node.list.isListOpen : undefined),
      set: (node, v) => {
        if (node.list) node.list.isListOpen = !v;
      },
    },
    1,
  )
  .add<boolean>(
    {
      get: (node) => node.list?.isRepeatsOpen,
      set: (node, v) => {
        if (node.list) node.list.isRepeatsOpen = Boolean(v);
      },
    },
    1,
  )
  .add<boolean>(
    {
      get: (node) => node.list?.isHiddenOpen,
      set: (node, v) => {
        if (node.list) node.list.isHiddenOpen = Boolean(v);
      },
    },
    1,
  );

// упаковка - list
const blockL = new TPackedData<ILNode>()
  .add<number>(
    {
      get: (node) => node.list?.tab,
      set: (node, v) => {
        if (node.list) node.list.tab = v;
      },
    },
    3,
  )
  .add<number>(
    {
      get: (node) => (node.list?.index !== undefined && node.list.index >= 0 ? node.list.index + 1 : undefined),
      set: (node, v) => {
        if (node.list && v > 0) node.list.index = v - 1;
      },
    },
    12,
  )
  .add<number>(
    {
      get: (node) => node.list?.parentLID,
      set: (node, v) => {
        if (node.list) node.list.parentLID = v;
      },
    },
    17,
  );

export function toDB(node: ILNode): INodeDB {
  const res: INodeDB = {
    _id: node._id,
    userId: node.userId || undefined,
    pageId: node.pageId,
    inTrash: node.inTrash,
    lastUpdate: node.lastUpdate,
    type: node.type,
    title: node.title,
    // ok: this.ok,
  };
  // родители фреймов
  if (node.frame) {
    res.f = node.frame.parents.size > 0 ? node.frame.pack() : null;
    res.i = node.frame.isFrameIn ? true : null;
    res.o = node.frame.isFrameOut ? true : null;
  }
  // упаковываем данные в одну переменную listData
  if (node.list && node.list.parentLID !== undefined) {
    if (node.isLockedInOutFrame && node.outFrameLID && (node.list as any)?.parentNode?.type === 4) {
      const origParentLID = node.list.parentLID;
      node.list.parentLID = node.outFrameLID;
      res.L = blockL.pack(node);
      node.list.parentLID = origParentLID;
    } else {
      res.L = blockL.pack(node);
    }
    res.x = undefined;
    res.y = undefined;
  } else {
    res.x = node.x;
    res.y = node.y;
    res.L = undefined;
  }
  // упаковка - s - разные переменные
  res.s = blockS.pack(node);
  // упаковка - TClones
  res.A = blockA.pack(node);
  if (node.clones?.sourceNodeId) {
    res.c = node.clones.sourceNodeId;
  }
  // переменные для repeatMode и разных дат
  res.D = blockD.pack(node);

  if (node.exData) {
    res.exData = {
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
  if (node.isLockedInOutFrame) {
    res.isLockedInOutFrame = true;
    res.outFrameLID = node.outFrameLID;
  }
  return res;
}
export function fromDB(db: INodeDB, node: ILNode) {
  node._id = db._id ?? "";
  node.userId = db.userId;
  node.pageId = db.pageId;
  node.inTrash = db.inTrash;
  node.lastUpdate = db.lastUpdate;
  node.type = db.type ?? 0;
  node.x = db.x ?? 0;
  node.y = db.y ?? 0;
  node.title = db.title;
  // this.ok = db.ok;
  // распаковываем list
  if (db.L !== undefined && db.L !== null) {
    blockL.unpack(node, db.L);
  } else if (node.list) {
    node.list.parentLID = undefined;
    node.list.index = undefined;
    node.list.tab = 0;
  }
  if (db.exData) {
    node.exData = {
      ownerNodesIds: db.exData.ownerNodesIds,
      bgColor: db.exData.bgColor,
      tColor: db.exData.tColor,
      repeatMode: db.exData.repeatMode,
      repeatDay: db.exData.repeatDay,
      url: db.exData.url,
      h: db.exData.h,
      hh: db.exData.hh,
    };
  } else {
    node.exData = undefined;
  }
  // распаковываем разные переменные
  blockS.unpack(node, db.s);

  // распаковываем TClones
  blockA.unpack(node, db.A);
  if (db.c && node.clones) {
    node.clones.sourceNodeId = String(db.c);
  }

  // распаковываем repeatMode и разные дат
  blockD.unpack(node, db.D);
  // родители фреймов
  if (db.f && node.frame) {
    node.frame.parentsLID = db.f;
  }
  if (node.frame) {
    node.frame.isFrameIn = Boolean(db.i);
    node.frame.isFrameOut = Boolean(db.o);
  }
  if (db.isLockedInOutFrame) {
    node.isLockedInOutFrame = true;
    node.outFrameLID = db.outFrameLID;
  }
  return node;
}
