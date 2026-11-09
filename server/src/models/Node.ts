import mongoose, { Model, Document } from "mongoose";
import type { INodeDB } from "../../../shared/types/INodeDB.js";

export interface INodeDocument
  extends Omit<INodeDB, "_id" | "userId" | "pageId" | "c">, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pageId?: mongoose.Types.ObjectId | null;
  c?: mongoose.Types.ObjectId | null;
}

const exDataSchema = new mongoose.Schema(
  {
    ownerNodesIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: undefined,
    },
    bgColor: { type: String },
    tColor: { type: String },
    repeatMode: { type: String },
    repeatDay: { type: Date },
    url: { type: String },
    h: { type: String },
    hh: { type: Number },
  },
  { _id: false },
);

const outNodeItemSchema = new mongoose.Schema(
  {
    _id: { type: String },
    lID: { type: Number },
    parentLID: { type: Number },
    title: { type: String },
    tab: { type: Number },
    index: { type: Number },
    c: { type: String },
    s: { type: Number },
    D: { type: Number },
  },
  { _id: false },
);

const outFrameSchema = new mongoose.Schema(
  {
    _id: { type: String },
    lID: { type: Number },
    title: { type: String },
    items: { type: [outNodeItemSchema], default: [] },
  },
  { _id: false },
);

const nodeSchema = new mongoose.Schema<INodeDocument>({
  s: { type: Number }, // разные переменные
  //   _id: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     required: true,s
  //   },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  x: { type: mongoose.Schema.Types.Int32 },
  y: { type: mongoose.Schema.Types.Int32 },
  type: { type: mongoose.Schema.Types.Int32 },
  inTrash: { type: Boolean },
  lastUpdate: { type: Date },
  title: { type: String },
  ok: { type: Boolean },
  L: { type: Number },
  exData: {
    type: exDataSchema,
    default: undefined, // не записывать если пустой
  },
  A: { type: Number }, //переменные для клонов LNode_TEClone,
  P: { type: Number }, //настройки LNode_Page (selectedOutLID + outLimit)
  out: { type: [outFrameSchema], default: undefined }, //слепок OUT-фреймов страницы
  c: { type: mongoose.Schema.Types.ObjectId, ref: "Nodes" }, // ID оригинальной ноды для клона (sourceNodeId / clone of)
  f: { type: [Number], default: undefined }, //родители фреймов
  D: { type: Number }, //переменные для repeatMode и разных дат,
  i: { type: Boolean },
  o: { type: Boolean },
});

// Ключевые индексы для выборок уровня и дельта-синхронизации
nodeSchema.index({ pageId: 1, inTrash: 1 });
nodeSchema.index({ pageId: 1, lastUpdate: 1 });
nodeSchema.index({ pageId: 1, i: 1 });
nodeSchema.index({ pageId: 1, o: 1 });
nodeSchema.index({ userId: 1 }, { sparse: true });
nodeSchema.index({ c: 1 });

export const Node: Model<INodeDocument> =
  mongoose.models["Nodes"] ||
  mongoose.model<INodeDocument>("Nodes", nodeSchema);
