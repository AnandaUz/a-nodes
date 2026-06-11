import mongoose, { Model, Document } from "mongoose";
import type { INode } from "../../../shared/types/INode.js";

export interface INodeDocument
  extends Omit<INode, "_id" | "userId" | "pageId">, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pageId?: mongoose.Types.ObjectId | null;
}

const nodeSchema = new mongoose.Schema<INodeDocument>({
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
  x: { type: Number },
  y: { type: Number },
  type: { type: Number },
  inTrash: { type: Boolean },
  lastUpdate: { type: Date },
  title: { type: String },
  ok: { type: Boolean },
  exData: {
    ownerNodesIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: undefined,
    },
    color: { type: String },
    repeatMode: { type: String },
    repeatDay: { type: Date },
  },
});

// Ключевой индекс — запрос "все ноды юзера на этом уровне" будет мгновенным
nodeSchema.index({ ownerId: 1, pageId: 1 });

export const Node: Model<INodeDocument> =
  mongoose.models["Nodes"] ||
  mongoose.model<INodeDocument>("Nodes", nodeSchema);
