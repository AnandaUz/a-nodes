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
  exData?: IExData | undefined;
  f?: number[] | undefined;
  D?: number | undefined; //переменные для repeatMode и разных дат
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
        if (node.frame) node.frame.isFrame = v;
      },
    },
    1,
  )
  .add<boolean>(
    {
      get: (node) => node.hiddenBD,
      set: (node, v) => {
        node.hiddenBD = v;
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
      get: (node) => node.list?.index,
      set: (node, v) => {
        if (node.list) node.list.index = v;
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
    userId: node.userId,
    pageId: node.pageId,
    inTrash: node.inTrash,
    lastUpdate: node.lastUpdate,
    type: node.type,
    title: node.title,
    // ok: this.ok,
  };
  // родители фреймов
  if (node.frame && node.frame.parents.size > 0) {
    res.f = node.frame.pack();
  }
  // упаковываем данные в одну переменную listData
  if (node.list && node.list.parentLID !== undefined) {
    res.L = blockL.pack(node);
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
  blockL.unpack(node, db.L);
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

  // распаковываем repeatMode и разные дат
  blockD.unpack(node, db.D);
  // родители фреймов
  if (db.f && node.frame) {
    node.frame.parentsLID = db.f;
  }
  return node;
}
