import type { Response } from "express";
import { Node } from "../models/Node";
import type { AuthRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";

// ─── GET /api/desk/root ───────────────────────────────────────────
// Корневой уровень — все ноды у которых parentId = null
// export const getRootDesk = async (req: AuthRequest, res: Response) => {
//     try {
//         const ownerId = req.user!.id;

//          Node.find({ ownerId, parentId: null } as any),
//             DeskConnector.find({ ownerId, deskId: 'root' } as any),
//         ]);

//         res.json({ nodes, connectors });
//     } catch (err: any) {
//         console.error('[getRootDesk Error]:', err);
//         res.status(500).json({ message: 'Ошибка загрузки корневого desk', error: err?.message });
//     }
// };

// ─── GET /api/desk/:nodeId ────────────────────────────────────────
// Вложенный уровень — все ноды у которых parentId = :nodeId
export const getNodesByParentNodeId = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const ownerId = req.user!.id;
    const nodeId = req.params["nodeId"];

    // Создаем массив для поиска, исключая undefined
    let pageId: string | null = null;
    if (typeof nodeId === "string" && nodeId !== "root") {
      pageId = nodeId;
    }

    const nodes = await Node.find({
      pageId: { $in: [null, pageId] },
      inTrash: { $ne: true },
    }).lean();

    res.json({ nodes });
  } catch (err: any) {
    console.error("[getDeskByNodeId Error]:", err);
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

export const saveNodes = async (req: AuthRequest, res: Response) => {
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
