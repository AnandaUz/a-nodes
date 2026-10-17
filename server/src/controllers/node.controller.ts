import type { Request, Response } from "express";
import { Node } from "../models/Node";
import mongoose from "mongoose";

export const getNodesByParentNodeId = async (req: Request, res: Response) => {
  try {
    const nodeId = req.params["nodeId"] as string;
    const isRoot = nodeId === "root";

    const pageFilter = isRoot ? null : new mongoose.Types.ObjectId(nodeId);

    const exStr = "-__v -inTrash -ok";

    const [nodes, pageNode] = await Promise.all([
      Node.find({
        pageId: pageFilter as any,
        $or: [
          // обычные ноды — без мусора
          { inTrash: { $ne: true }, ok: { $ne: true } },
          // просроченные — выдаём всегда
          { "exData.repeatDay": { $lt: new Date() } },
        ],
      })
        .select(exStr)
        .lean(),

      isRoot ? null : Node.findById(nodeId).select(exStr).lean(),
    ]);

    res.json({ nodes, pageNode });
  } catch (err: any) {
    console.error("[getNodesByParentNodeId Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка загрузки desk", error: err?.message });
  }
};

// export const saveNode = async (req: AuthRequest, res: Response) => {
//   try {
//     const { node } = req.body;

//     let updatedNode;

//     if (node._id) {
//       // Обновляем существующую
//       updatedNode = await Node.findByIdAndUpdate(
//         node._id,
//         { $set: { ...node } },
//         { new: true },
//       );
//     } else {
//       // Создаём новую — MongoDB сам сгенерирует _id
//       updatedNode = await Node.create(node);
//     }

//     res.status(200).json({ node: updatedNode });
//   } catch (error) {
//     res.status(500).json({ error: "Server error" });
//   }
// };
export const saveNodesController = async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ message: "Ожидался массив нод" });
    }
    const ids = await saveNodes(nodes);
    res.json({ ids });
  } catch (err: any) {
    console.error("[saveNodes Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка сохранения нод", error: err?.message });
  }
};

export const saveNodes = async (nodes: any[]) => {
  try {
    const operations = nodes.map((node: any) => {
      const { _id, ...updateData } = node;

      const setFields: Record<string, any> = {};
      const unsetFields: Record<string, ""> = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (value === null) {
          // ← проверяем null, не undefined
          unsetFields[key] = "";
        } else {
          setFields[key] = value;
        }
      }

      const update: Record<string, any> = {};
      if (Object.keys(setFields).length > 0) update.$set = setFields;
      if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

      return {
        updateOne: {
          filter: { _id: _id || new mongoose.Types.ObjectId() },
          update,
          upsert: true,
        },
      };
    });

    const result = await Node.bulkWrite(operations, { ordered: true });

    const ids = nodes.map((node: any, index: number) => {
      const upsertedId = result.upsertedIds[index];
      return upsertedId ? upsertedId.toString() : node._id;
    });

    return ids;
  } catch (err: any) {
    return null;
  }
};

export const deleteNodeController = async (req: Request, res: Response) => {
  try {
    const id = req.params["id"] as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Невалидный id" });
    }
    await Node.findByIdAndDelete(id);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[deleteNode Error]:", err);
    res.status(500).json({ message: "Ошибка удаления ноды", error: err?.message });
  }
};
