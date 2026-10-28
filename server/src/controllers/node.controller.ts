import type { Request, Response } from "express";
import {
  bulkSaveNodes,
  createQuickNode,
  deleteNodeById,
  findQuickTargets,
  getNodesAndPageByNodeId,
  isValidObjectId,
} from "../services/node.service";

export const getNodesByParentNodeId = async (req: Request, res: Response) => {
  try {
    const nodeId = req.params["nodeId"] as string;
    const { nodes, pageNode } = await getNodesAndPageByNodeId(nodeId);
    res.json({ nodes, pageNode });
  } catch (err: any) {
    console.error("[getNodesByParentNodeId Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка загрузки desk", error: err?.message });
  }
};

export const saveNodesController = async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ message: "Ожидался массив нод" });
    }
    const ids = await bulkSaveNodes(nodes);
    res.json({ ids });
  } catch (err: any) {
    console.error("[saveNodes Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка сохранения нод", error: err?.message });
  }
};

export const saveNodes = bulkSaveNodes;

export const deleteNodeController = async (req: Request, res: Response) => {
  try {
    const id = req.params["id"] as string;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Невалидный id" });
    }
    await deleteNodeById(id);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[deleteNode Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка удаления ноды", error: err?.message });
  }
};

const checkApiKey = (req: Request): boolean => {
  const secretKey =
    process.env.API_SECRET_KEY || "anodes_sec_9f7c2a4e8b1d3f605a9e7c1b4d8a2f5e";
  const authHeader = req.headers.authorization;
  const apiKey =
    (req.headers["x-api-key"] as string) ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null);
  return Boolean(apiKey && apiKey === secretKey);
};

export const getQuickTargetsController = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!checkApiKey(req)) {
      return res.status(401).json({ message: "Неверный API ключ" });
    }

    const marker = (req.query.q as string) || ">>";
    const pageId = req.query.pageId as string | undefined;

    const targets = await findQuickTargets(marker, pageId);
    res.json({ success: true, targets });
  } catch (err: any) {
    console.error("[getQuickTargets Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка получения списка целей", error: err?.message });
  }
};

export const quickAddNodeController = async (req: Request, res: Response) => {
  try {
    if (!checkApiKey(req)) {
      return res.status(401).json({ message: "Неверный API ключ" });
    }

    let rawText = "";
    let customParentTitle: string | undefined;
    let customPageId: string | undefined;
    let customParentLID: number | undefined;
    let customTab: number | undefined;
    let customIndex: number | undefined;
    let customUserId: any;
    let customS: number | undefined;

    if (typeof req.body === "string") {
      rawText = req.body.trim();
    } else if (req.body && typeof req.body === "object") {
      rawText = (req.body.text || req.body.title || "").toString().trim();
      customParentTitle = req.body.parentTitle;
      customPageId = req.body.pageId;
      if (req.body.parentLID !== undefined)
        customParentLID = Number(req.body.parentLID);
      if (req.body.tab !== undefined) customTab = Number(req.body.tab);
      if (req.body.index !== undefined) customIndex = Number(req.body.index);
      if (req.body.s !== undefined) customS = Number(req.body.s);
      customUserId = req.body.userId;
    }

    if (!rawText) {
      return res
        .status(400)
        .json({ message: "Текст ноды не может быть пустым" });
    }

    const node = await createQuickNode({
      rawText,
      customParentTitle,
      customPageId,
      customParentLID,
      customTab,
      customIndex,
      customUserId,
      customS,
    });

    res.status(201).json({
      success: true,
      node,
    });
  } catch (err: any) {
    console.error("[quickAddNode Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка добавления ноды", error: err?.message });
  }
};

