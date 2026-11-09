import type { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { Node } from "../models/Node";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  bulkSaveNodes,
  canUserAccessPage,
  createQuickNode,
  deleteNodeById,
  deleteNodesByIds,
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
    const status = err?.status || 500;
    if (status >= 500) {
      console.error("[getNodesByParentNodeId Error]:", err);
    }
    res
      .status(status)
      .json({ message: err?.message || "Ошибка загрузки desk" });
  }
};

export const deskEventsController = async (req: Request, res: Response) => {
  const nodeId = (req.params["nodeId"] as string) || "root";
  const clientId =
    (req.query["clientId"] as string) ||
    (req.headers["x-client-id"] as string) ||
    undefined;
  const userId = (req as AuthRequest).user?.id;

  if (!(await canUserAccessPage(nodeId, userId, "read"))) {
    return res.status(403).json({ message: "Доступ к событиям страницы запрещён" });
  }

  const channelId = nodeId === "root" && userId ? `root:${userId}` : nodeId;

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

  const unsubscribe = sseService.subscribe(channelId, sseClient);

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
    const nodeObjectIds: mongoose.Types.ObjectId[] = [];
    const sourceObjectIds: mongoose.Types.ObjectId[] = [];
    const pageObjectIds: mongoose.Types.ObjectId[] = [];

    for (const node of nodes) {
      affectedDesks.add(node.pageId ? String(node.pageId) : "root");
      if (node._id && mongoose.isValidObjectId(node._id)) {
        const oId = new mongoose.Types.ObjectId(node._id);
        affectedDesks.add(String(node._id));
        nodeObjectIds.push(oId);
      }
      if (node.c && mongoose.isValidObjectId(node.c)) {
        sourceObjectIds.push(new mongoose.Types.ObjectId(node.c));
      }
      if (node.pageId && mongoose.isValidObjectId(node.pageId)) {
        pageObjectIds.push(new mongoose.Types.ObjectId(node.pageId));
      }
    }

    if (nodeObjectIds.length > 0) {
      const clones = await Node.find({
        c: { $in: nodeObjectIds },
        inTrash: { $ne: true },
      })
        .select("pageId")
        .lean();

      for (const cl of clones) {
        affectedDesks.add(cl.pageId ? String(cl.pageId) : "root");
      }
    }

    if (sourceObjectIds.length > 0) {
      const sources = await Node.find({
        _id: { $in: sourceObjectIds },
        inTrash: { $ne: true },
      })
        .select("pageId")
        .lean();

      for (const src of sources) {
        affectedDesks.add(src.pageId ? String(src.pageId) : "root");
      }
    }

    if (pageObjectIds.length > 0) {
      const parentPages = await Node.find({
        _id: { $in: pageObjectIds },
        inTrash: { $ne: true },
      })
        .select("pageId")
        .lean();

      for (const pp of parentPages) {
        affectedDesks.add(pp.pageId ? String(pp.pageId) : "root");
      }
    }

    for (const deskId of affectedDesks) {
      const channelId = deskId === "root" && userId ? `root:${userId}` : deskId;
      sseService.broadcastToDesk(
        channelId,
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
    const userId = (req as AuthRequest).user?.id;
    const senderId = (req.headers["x-client-id"] as string) || undefined;
    const bodyIds = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : null;

    if (bodyIds) {
      const validIds = bodyIds.filter(
        (id) => typeof id === "string" && isValidObjectId(id),
      );
      if (validIds.length === 0) {
        return res.status(400).json({ message: "Невалидный список ids" });
      }
      const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
      const existingNodes = await Node.find({ _id: { $in: objectIds } })
        .select("pageId")
        .lean();
      await deleteNodesByIds(validIds, userId);

      const affectedDesks = new Set<string>();
      for (const n of existingNodes) {
        affectedDesks.add(n.pageId ? String(n.pageId) : "root");
      }
      const serverTime = new Date().toISOString();
      for (const deskId of affectedDesks) {
        const channelId =
          deskId === "root" && userId ? `root:${userId}` : deskId;
        sseService.broadcastToDesk(
          channelId,
          {
            type: "nodes_updated",
            senderId,
            serverTime,
          },
          senderId,
        );
      }
      return res.json({ success: true, ids: validIds });
    }

    const id = req.params["id"] as string;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Невалидный id" });
    }
    const deletedNode = await deleteNodeById(id, userId);
    if (deletedNode) {
      const targetDesks = new Set<string>();
      const deskId = deletedNode.pageId ? String(deletedNode.pageId) : "root";
      targetDesks.add(deskId);
      if (deletedNode.pageId && mongoose.isValidObjectId(deletedNode.pageId)) {
        const parentPage = await Node.findOne({ _id: deletedNode.pageId })
          .select("pageId")
          .lean();
        if (parentPage) {
          targetDesks.add(parentPage.pageId ? String(parentPage.pageId) : "root");
        }
      }
      const nowIso = new Date().toISOString();
      for (const dId of targetDesks) {
        const channelId = dId === "root" && userId ? `root:${userId}` : dId;
        sseService.broadcastToDesk(
          channelId,
          {
            type: "nodes_updated",
            senderId,
            serverTime: nowIso,
          },
          senderId,
        );
      }
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
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) return false;
  const authHeader = req.headers.authorization;
  const apiKey =
    (req.headers["x-api-key"] as string) ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null);
  if (!apiKey) return false;
  const keyBuf = Buffer.from(apiKey);
  const secretBuf = Buffer.from(secretKey);
  if (keyBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, secretBuf);
};

export const getQuickTargetsController = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!checkApiKey(req)) {
      return res.status(401).json({ message: "Неверный API ключ" });
    }

    const rawQ = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const marker = (rawQ || ">>").slice(0, 64);
    const pageId =
      typeof req.query.pageId === "string" ? req.query.pageId : undefined;

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

