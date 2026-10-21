import type { Request, Response } from "express";
import { Node } from "../models/Node";
import { User } from "../models/User";
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

export const quickAddNodeController = async (req: Request, res: Response) => {
  try {
    const secretKey =
      process.env.API_SECRET_KEY || "anodes_sec_9f7c2a4e8b1d3f605a9e7c1b4d8a2f5e";
    const authHeader = req.headers.authorization;
    const apiKey =
      (req.headers["x-api-key"] as string) ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null);

    if (!apiKey || apiKey !== secretKey) {
      return res.status(401).json({ message: "Неверный API ключ" });
    }

    let rawText = "";
    let customPageId: string | undefined;
    let customParentLID: number | undefined;
    let customTab: number | undefined;
    let customIndex: number | undefined;
    let customUserId: any;

    if (typeof req.body === "string") {
      rawText = req.body.trim();
    } else if (req.body && typeof req.body === "object") {
      rawText = (req.body.text || req.body.title || "").toString().trim();
      customPageId = req.body.pageId;
      if (req.body.parentLID !== undefined) customParentLID = Number(req.body.parentLID);
      if (req.body.tab !== undefined) customTab = Number(req.body.tab);
      if (req.body.index !== undefined) customIndex = Number(req.body.index);
      customUserId = req.body.userId;
    }

    if (!rawText) {
      return res.status(400).json({ message: "Текст ноды не может быть пустым" });
    }

    // Дефолтные значения: pageId: 6a202840c694fa28ab705628, родитель L: 4292609 (parentLID: 131, tab: 1)
    const targetPageId = customPageId || "6a202840c694fa28ab705628";
    const targetParentLID = customParentLID !== undefined ? customParentLID : 131;
    const targetTab = customTab !== undefined ? customTab : 1;

    let targetUserId: any = customUserId;
    if (!targetUserId) {
      const adminId = process.env.BOT_ADMIN ? Number(process.env.BOT_ADMIN) : null;
      let user = adminId
        ? await User.findOne({ telegramId: adminId }).select("_id").lean()
        : null;
      if (!user) {
        user = await User.findOne().select("_id").lean();
      }
      targetUserId = user?._id;
    }

    const isRoot = !targetPageId || targetPageId === "root";
    const pageFilter = isRoot ? null : new mongoose.Types.ObjectId(targetPageId);

    // Ищем детей целевого родителя, чтобы вычислить следующий index
    const pageNodes = await Node.find({
      pageId: pageFilter as any,
      inTrash: { $ne: true },
    })
      .select("L")
      .lean();

    let maxChildIndex = -1;
    for (const n of pageNodes) {
      if (typeof n.L === "number") {
        const pLID = (n.L >> 15) & 0x1ffff;
        if (pLID === targetParentLID) {
          const cIdx = (n.L >> 3) & 0xfff;
          if (cIdx > maxChildIndex) maxChildIndex = cIdx;
        }
      }
    }

    const finalIndex = customIndex !== undefined ? customIndex : maxChildIndex + 1;

    // Упаковываем L: tab (3 бита), index (12 бит), parentLID (17 бит)
    const t = targetTab & 0x7;
    const idx = finalIndex & 0xfff;
    const pLID = targetParentLID & 0x1ffff;
    const newL = ((t | (idx << 3) | (pLID << 15)) >>> 0);

    const nodeData: Record<string, any> = {
      title: rawText,
      type: 1, // TEXT_EDIT
      pageId: pageFilter,
      L: newL,
      lastUpdate: new Date(),
    };

    if (targetUserId) {
      nodeData["userId"] = new mongoose.Types.ObjectId(targetUserId);
    }

    // Новой ноде поле s (lID) не задаем
    const newNode = new Node(nodeData);
    await newNode.save();

    res.status(201).json({
      success: true,
      node: {
        _id: newNode._id,
        title: newNode.title,
        L: newL,
        parentLID: targetParentLID,
        tab: targetTab,
        index: finalIndex,
        pageId: targetPageId,
      },
    });
  } catch (err: any) {
    console.error("[quickAddNode Error]:", err);
    res.status(500).json({ message: "Ошибка добавления ноды", error: err?.message });
  }
};
