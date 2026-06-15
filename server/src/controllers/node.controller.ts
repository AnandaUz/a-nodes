import type { Request, Response } from "express";
import { Node } from "../models/Node";
// import type { AuthRequest } from "../middleware/auth.middleware";
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

export const saveNodes = async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ message: "Ожидался массив нод" });
    }

    const operations = nodes.map((node: any) => {
      const { _id, ...updateData } = node;
      return {
        updateOne: {
          filter: {
            _id: _id || new mongoose.Types.ObjectId(),
          },
          update: {
            $set: updateData,
          },
          upsert: true,
        },
      };
    });

    const result = await Node.bulkWrite(operations, { ordered: true });

    // Собираем _id в той же последовательности что и nodes
    const ids = nodes.map((node: any, index: number) => {
      // если нода была создана (upsert) — берём из результата
      const upsertedId = result.upsertedIds[index];
      return upsertedId ? upsertedId.toString() : node._id;
    });

    res.json({ ids });
  } catch (err: any) {
    console.error("[saveNodes Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка сохранения нод", error: err?.message });
  }
};

// ─── PUT /api/desk/:deskId ────────────────────────────────────────
// Сохраняем весь снапшот desk'а — заменяем ноды и коннекторы
// export const saveDesk = async (req: AuthRequest, res: Response) => {
//   try {
//     const ownerId = req.user!.id;
//     const deskId = req.params["deskId"];

//     if (!deskId) {
//       res.status(400).json({ message: "Не указан ID стола" });
//       return;
//     }

//     const { nodes } = req.body as {
//       nodes: Array<{
//         id: string;
//         x: number;
//         y: number;
//         width: number;
//         height: number;
//         text: string;
//         type: string;
//       }>;
//       // connectors: Array<{ id: string; fromId: string; toId: string }>;
//     };

//     const parentId = deskId === "root" ? null : deskId;

//     if (nodes && nodes.length > 0) {
//       await Node.insertMany(
//         nodes.map((n) => ({
//           _id: n.id,
//           ownerId,
//           ...(parentId !== null ? { parentId } : {}),
//           type: n.type || "default",
//           x: n.x,
//           y: n.y,
//           width: n.width,
//           height: n.height,
//           text: n.text,
//         })) as any[],
//       );
//     }

//     res.json({ ok: true });
//   } catch (err: any) {
//     console.error("[saveDesk Error]:", err);
//     res.status(500).json({
//       message: "Ошибка сохранения desk",
//       error: err?.message || String(err),
//     });
//   }
// };
