import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  bulkSaveNodes,
  createQuickNode,
  deleteNodeById,
  findQuickTargets,
  getNodesAndPageByNodeId,
  isValidObjectId,
} from "../services/node.service";
import { sseService, type SSEClient } from "../services/sse.service";

export const getNodesByParentNodeId = async (req: Request, res: Response) => {
  try {
    const nodeId = req.params["nodeId"] as string;
    const sinceParam = req.query["since"] as string | undefined;
    const since = sinceParam ? new Date(sinceParam) : undefined;
    const userId = (req as AuthRequest).user?.id;

    const { nodes, pageNode, serverTime, breadcrumbs } = await getNodesAndPageByNodeId(
      nodeId,
      userId,
      since,
    );
    res.json({ nodes, pageNode, serverTime, breadcrumbs });
  } catch (err: any) {
    console.error("[getNodesByParentNodeId Error]:", err);
    res
      .status(500)
      .json({ message: "Ошибка загрузки desk", error: err?.message });
  }
};

export const deskEventsController = (req: Request, res: Response) => {
  const nodeId = (req.params["nodeId"] as string) || "root";
  const clientId =
    (req.query["clientId"] as string) ||
    (req.headers["x-client-id"] as string) ||
    undefined;
  const userId = (req as AuthRequest).user?.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(": connected\n\n");

  const sseClient: SSEClient = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    clientId,
    userId,
    res,
  };

  const unsubscribe = sseService.subscribe(nodeId, sseClient);

  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(pingInterval);
    unsubscribe();
  });
};

export const saveNodesController = async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;
    const userId = (req as AuthRequest).user?.id;
    const senderId = (req.headers["x-client-id"] as string) || undefined;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ message: "Ожидался массив нод" });
    }
    const ids = await bulkSaveNodes(nodes, userId);
    const serverTime = new Date();

    const affectedDesks = new Set<string>();
    for (const node of nodes) {
      affectedDesks.add(node.pageId ? String(node.pageId) : "root");
      if (node._id) {
        affectedDesks.add(String(node._id));
      }
    }

    for (const deskId of affectedDesks) {
      sseService.broadcastToDesk(
        deskId,
        {
          type: "nodes_updated",
          senderId,
          serverTime: serverTime.toISOString(),
        },
        senderId,
      );
    }

    res.json({ ids, updatedAt: serverTime });
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
    const userId = (req as AuthRequest).user?.id;
    const senderId = (req.headers["x-client-id"] as string) || undefined;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Невалидный id" });
    }
    const deletedNode = await deleteNodeById(id, userId);
    if (deletedNode) {
      const deskId = deletedNode.pageId ? String(deletedNode.pageId) : "root";
      sseService.broadcastToDesk(
        deskId,
        {
          type: "nodes_updated",
          senderId,
          serverTime: new Date().toISOString(),
        },
        senderId,
      );
    }
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

