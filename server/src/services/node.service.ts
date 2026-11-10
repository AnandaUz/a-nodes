import mongoose from "mongoose";
import { Node } from "../models/Node";
import { User } from "../models/User";
import type {
  IOutFrameData,
  IOutNodeItem,
} from "../../../shared/types/INodeDB";
import {
  extractLIDFromS,
  patchLIDInS,
  extractFlagsFromS,
  packL,
} from "../../../shared/types/INodeDB";

export async function syncPageOutSnapshot(
  pageId: string | mongoose.Types.ObjectId,
): Promise<IOutFrameData[]> {
  const pageIdStr = String(pageId);
  if (!isValidObjectId(pageIdStr)) return [];
  const pageObjId = new mongoose.Types.ObjectId(pageIdStr);

  const outFrames = await Node.find({
    pageId: pageObjId,
    o: true,
    inTrash: { $ne: true },
  })
    .sort({ y: 1, x: 1, _id: 1 })
    .lean();

  if (outFrames.length === 0) {
    await Node.updateOne(
      { _id: pageObjId },
      { $set: { out: [], lastUpdate: new Date() } },
    );
    return [];
  }

  const subNodes = await Node.find({
    pageId: pageObjId,
    inTrash: { $ne: true },
    ok: { $ne: true },
  }).lean();

  type ParsedChild = {
    raw: any;
    nodeLID: number;
    parentLID: number;
    tab: number;
    index: number;
  };

  const childrenByParentLID = new Map<number, ParsedChild[]>();
  for (const n of subNodes) {
    if (n.L === undefined || n.L === null) continue;
    const parentLID = (n.L >> 15) & 0x1ffff;
    if (parentLID <= 0) continue;
    const nodeLID = extractLIDFromS(n.s);
    const tab = n.L & 0x7;
    const rawIdx = (n.L >> 3) & 0xfff;
    const index = rawIdx > 0 ? rawIdx - 1 : 0;

    let list = childrenByParentLID.get(parentLID);
    if (!list) {
      list = [];
      childrenByParentLID.set(parentLID, list);
    }
    list.push({ raw: n, nodeLID, parentLID, tab, index });
  }

  const out: IOutFrameData[] = [];

  for (const frame of outFrames) {
    const outFrameLID = extractLIDFromS(frame.s);
    if (!outFrameLID) continue;

    const items: IOutNodeItem[] = [];
    const visited = new Set<number>([outFrameLID]);

    const walk = (pLID: number) => {
      const children = childrenByParentLID.get(pLID) || [];
      children.sort((a, b) => a.index - b.index);
      for (const ch of children) {
        const { hiddenBD } = extractFlagsFromS(ch.raw.s);
        if (hiddenBD) continue;
        items.push({
          _id: String(ch.raw._id),
          lID: ch.nodeLID,
          parentLID: pLID,
          title: ch.raw.title || "",
          tab: ch.tab || 1,
          index: ch.index,
          c: ch.raw.c ? String(ch.raw.c) : undefined,
          s: ch.raw.s,
          D: ch.raw.D,
        });
        if (ch.nodeLID > 0 && !visited.has(ch.nodeLID)) {
          visited.add(ch.nodeLID);
          walk(ch.nodeLID);
        }
      }
    };

    walk(outFrameLID);

    out.push({
      _id: String(frame._id),
      lID: outFrameLID,
      title: frame.title || "",
      items,
    });
  }

  await Node.updateOne(
    { _id: pageObjId },
    { $set: { out, lastUpdate: new Date() } },
  );

  return out;
}

export interface QuickAddNodeInput {
  rawText: string;
  customParentTitle?: string | undefined;
  customPageId?: string | undefined;
  customParentLID?: number | undefined;
  customTab?: number | undefined;
  customIndex?: number | undefined;
  customUserId?: any;
  customS?: number | undefined;
}

export interface QuickTargetItem {
  _id: any;
  title: string;
  cleanTitle: string;
  parentLID: number;
  pageId: string;
}

export function isValidObjectId(id: string): boolean {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
}

const PUBLIC_READONLY_PAGE_IDS = new Set(["6a38c536ddc2e09f58fe390f"]);
const PAGE_CACHE_TTL_MS = 60_000;

interface UserPagesCacheEntry {
  expiresAt: number;
  ownedPages: Set<string>;
}

const userPagesCache = new Map<string, UserPagesCacheEntry>();

export function invalidateUserPagesCache(userId?: string): void {
  if (userId) {
    userPagesCache.delete(userId);
  } else {
    userPagesCache.clear();
  }
}

export async function getUserOwnedPageIds(userId: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = userPagesCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.ownedPages;
  }

  const owned = new Set<string>();
  if (!isValidObjectId(userId)) return owned;
  const userObjId = new mongoose.Types.ObjectId(userId);

  const [userDoc, directPages] = await Promise.all([
    User.findById(userObjId).select("settings.homeId").lean(),
    Node.find({ userId: userObjId }).select("_id").lean(),
  ]);

  if (userDoc?.settings?.homeId) {
    owned.add(String(userDoc.settings.homeId));
  }
  for (const p of directPages) {
    owned.add(String(p._id));
  }

  if (owned.size > 0) {
    const allPages = await Node.find({
      $or: [{ type: 4 }, { "exData.url": { $exists: true, $ne: null } }],
    })
      .select("_id pageId exData.url")
      .lean();

    let added = true;
    while (added) {
      added = false;
      for (const p of allPages) {
        const pid = p.pageId ? String(p.pageId) : null;
        if (pid && owned.has(pid)) {
          const nid = String(p._id);
          if (!owned.has(nid)) {
            owned.add(nid);
            added = true;
          }
          const uUrl = (p as any).exData?.url;
          if (
            typeof uUrl === "string" &&
            /^[0-9a-fA-F]{24}$/.test(uUrl) &&
            !PUBLIC_READONLY_PAGE_IDS.has(uUrl) &&
            !owned.has(uUrl)
          ) {
            owned.add(uUrl);
            added = true;
          }
        }
      }
    }
  }

  userPagesCache.set(userId, {
    expiresAt: now + PAGE_CACHE_TTL_MS,
    ownedPages: owned,
  });
  return owned;
}

export async function canUserAccessPage(
  nodeId: string,
  userId?: string,
  mode: "read" | "write" = "read",
): Promise<boolean> {
  if (!userId || !isValidObjectId(userId)) return false;
  if (nodeId === "root") return true;
  if (mode === "read" && PUBLIC_READONLY_PAGE_IDS.has(nodeId)) return true;

  const owned = await getUserOwnedPageIds(userId);
  if (owned.has(nodeId)) return true;

  if (isValidObjectId(nodeId)) {
    const pageDoc = await Node.findById(nodeId).select("userId pageId").lean();
    if (pageDoc) {
      if (pageDoc.userId && String(pageDoc.userId) === userId) {
        owned.add(nodeId);
        return true;
      }
      if (pageDoc.pageId && owned.has(String(pageDoc.pageId))) {
        owned.add(nodeId);
        return true;
      }
    }
  }
  return false;
}

export async function getNodesAndPageByNodeId(
  nodeId: string,
  userId?: string,
  since?: Date,
) {
  const isRoot = nodeId === "root";
  if (!isRoot && !isValidObjectId(nodeId)) {
    const err: any = new Error("Некорректный ID страницы");
    err.status = 400;
    throw err;
  }

  if (!(await canUserAccessPage(nodeId, userId, "read"))) {
    const err: any = new Error("Доступ к этой странице запрещён");
    err.status = 403;
    throw err;
  }

  const pageFilter = isRoot ? null : new mongoose.Types.ObjectId(nodeId);

  const nodeQuery: any = {
    pageId: pageFilter,
  };
  if (isRoot && userId && isValidObjectId(userId)) {
    nodeQuery.userId = new mongoose.Types.ObjectId(userId);
  }

  // Дельта-синхронизация: возвращаем только изменившиеся/удаленные после since
  if (since && !isNaN(since.getTime())) {
    nodeQuery.lastUpdate = { $gt: since };
  } else {
    nodeQuery.$or = [
      { inTrash: { $ne: true }, ok: { $ne: true } },
      { "exData.repeatDay": { $lt: new Date() } },
    ];
  }

  const exStr = since ? "-__v -userId" : "-__v -inTrash -ok -userId";

  const pageQuery: any = isRoot
    ? null
    : { _id: new mongoose.Types.ObjectId(nodeId) };

  const [nodes, pageNode] = await Promise.all([
    Node.find(nodeQuery).select(exStr).lean(),
    pageQuery ? Node.findOne(pageQuery).select("-__v").lean() : null,
  ]);

  const isDelta = Boolean(since && !isNaN(since.getTime()));

  // Однократная миграция `out` только для старых нод-страниц (type === 4), где `out` ещё не сохранён
  for (const n of nodes as any[]) {
    if (n.type === 4 && n.out === undefined && n._id) {
      n.out = await syncPageOutSnapshot(n._id);
    }
  }

  // Подгрузка оригиналов для клонов (поле `c`), если оригиналы находятся на других страницах
  const loadedIds = new Set(nodes.map((n: any) => String(n._id)));
  const cloneSourceIds = new Set<string>();
  for (const n of nodes as any[]) {
    if (n.c && !loadedIds.has(String(n.c))) {
      cloneSourceIds.add(String(n.c));
    }
    if (n.type === 4 && Array.isArray(n.out)) {
      for (const group of n.out) {
        for (const item of group.items || []) {
          if (item.c && !loadedIds.has(String(item.c))) {
            cloneSourceIds.add(String(item.c));
          }
        }
      }
    }
  }
  const missingSourceIds = [...cloneSourceIds]
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (missingSourceIds.length > 0 && userId) {
    const ownedPages = await getUserOwnedPageIds(userId);
    const ownedPageObjIds = [...ownedPages]
      .filter((id) => isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const missingSources = await Node.find({
      _id: { $in: missingSourceIds },
      pageId: { $in: ownedPageObjIds },
      inTrash: { $ne: true },
    })
      .select(exStr)
      .lean();

    for (const src of missingSources) {
      if (!loadedIds.has(String(src._id))) {
        loadedIds.add(String(src._id));
        nodes.push(src);
      }
    }
  }

  if (isDelta) {
    return { nodes, pageNode, serverTime: new Date(), breadcrumbs: undefined };
  }

  const breadcrumbs: { id: string; title: string }[] = [];
  const ownedPagesForBreadcrumbs = userId
    ? await getUserOwnedPageIds(userId)
    : new Set<string>();

  let targetPageNode: any = pageNode;
  if (!targetPageNode && !isRoot && isValidObjectId(nodeId)) {
    const ownedPageObjIds = [...ownedPagesForBreadcrumbs]
      .filter((id) => isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    targetPageNode = await Node.findOne({
      pageId: { $in: ownedPageObjIds },
      $or: [
        { "exData.url": nodeId },
        { "exData.url": `/desk/${nodeId}` },
      ],
    })
      .select("_id title pageId")
      .lean();
  }

  if (targetPageNode && !isRoot) {
    breadcrumbs.unshift({
      id: targetPageNode._id.toString(),
      title: targetPageNode.title || "",
    });

    const firstParentId = targetPageNode.pageId;
    if (firstParentId && isValidObjectId(firstParentId.toString())) {
      const collectionName = Node.collection?.name || "nodes";
      const aggResult = await Node.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(firstParentId.toString()),
          },
        },
        {
          $graphLookup: {
            from: collectionName,
            startWith: "$pageId",
            connectFromField: "pageId",
            connectToField: "_id",
            as: "ancestors",
            maxDepth: 19,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            pageId: 1,
            "ancestors._id": 1,
            "ancestors.title": 1,
            "ancestors.pageId": 1,
          },
        },
      ]);

      const firstDoc = aggResult[0];
      if (firstDoc) {
        const ancestorsMap = new Map<string, any>();
        ancestorsMap.set(firstDoc._id.toString(), firstDoc);
        for (const anc of firstDoc.ancestors || []) {
          ancestorsMap.set(anc._id.toString(), anc);
        }

        let currentParentId: any = firstParentId;
        const visited = new Set<string>([targetPageNode._id.toString()]);
        let depth = 0;

        while (
          currentParentId &&
          isValidObjectId(currentParentId.toString()) &&
          depth < 20
        ) {
          depth++;
          const parentIdStr = currentParentId.toString();
          if (visited.has(parentIdStr)) break;
          visited.add(parentIdStr);

          if (!ownedPagesForBreadcrumbs.has(parentIdStr)) break;
          const parentNode = ancestorsMap.get(parentIdStr);
          if (!parentNode) break;

          breadcrumbs.unshift({
            id: parentNode._id.toString(),
            title: parentNode.title || "",
          });

          currentParentId = parentNode.pageId;
        }
      }
    }
  }

  return { nodes, pageNode, serverTime: new Date(), breadcrumbs };
}

const ALLOWED_NODE_FIELDS = new Set([
  "pageId",
  "inTrash",
  "lastUpdate",
  "type",
  "x",
  "y",
  "title",
  "ok",
  "L",
  "s",
  "A",
  "P",
  "out",
  "c",
  "exData",
  "f",
  "D",
  "i",
  "o",
]);

export async function bulkSaveNodes(nodes: any[], userId?: string) {
  if (!nodes || nodes.length === 0) return { ids: [], serverTime: new Date() };
  if (!userId || !isValidObjectId(userId)) {
    throw new Error("Не указан авторизованный пользователь");
  }

  const now = new Date();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const ownedPages = await getUserOwnedPageIds(userId);

  const incomingIds = nodes
    .map((n) => n?._id)
    .filter((id): id is string => typeof id === "string" && isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const existingDocs =
    incomingIds.length > 0
      ? await Node.find({ _id: { $in: incomingIds } })
          .select("_id pageId userId type")
          .lean()
      : [];
  const existingMap = new Map(existingDocs.map((d) => [String(d._id), d]));

  const allowedPageIds = new Set(ownedPages);
  for (const node of nodes) {
    if (
      node?.type === 4 &&
      node?._id &&
      isValidObjectId(String(node._id)) &&
      (!node.pageId || allowedPageIds.has(String(node.pageId)))
    ) {
      allowedPageIds.add(String(node._id));
    }
  }

  let hasPageChanges = false;
  const validNodeIndexes: number[] = [];
  const operations: any[] = [];

  nodes.forEach((node: any, index: number) => {
    const { _id, userId: _ignoredUserId, ...updateData } = node;
    const idStr = _id && isValidObjectId(String(_id)) ? String(_id) : undefined;
    const existingDoc = idStr ? existingMap.get(idStr) : undefined;

    if (existingDoc) {
      const existingOwned = existingDoc.pageId
        ? ownedPages.has(String(existingDoc.pageId))
        : (existingDoc.userId && String(existingDoc.userId) === userId) ||
          ownedPages.has(String(existingDoc._id));
      if (!existingOwned) return;
    }

    if (
      updateData.pageId &&
      !allowedPageIds.has(String(updateData.pageId))
    ) {
      return;
    }

    const setFields: Record<string, any> = {};
    const unsetFields: Record<string, ""> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (!ALLOWED_NODE_FIELDS.has(key)) continue;
      if (value === null) {
        unsetFields[key] = "";
      } else {
        setFields[key] = value;
      }
    }

    const effectiveType = setFields.type ?? existingDoc?.type;
    const effectivePageId =
      "pageId" in setFields || "pageId" in unsetFields
        ? setFields.pageId
        : existingDoc?.pageId;
    const isRootNode = !effectivePageId;

    if (isRootNode) {
      setFields.userId = userObjectId;
      hasPageChanges = true;
    } else {
      if (existingDoc?.userId) {
        unsetFields.userId = "";
      }
      if (effectiveType === 4) {
        hasPageChanges = true;
      }
    }

    if (setFields.c && isValidObjectId(setFields.c)) {
      setFields.c = new mongoose.Types.ObjectId(setFields.c);
    }

    setFields.lastUpdate = now;

    for (const key of Object.keys(setFields)) {
      delete unsetFields[key];
    }

    const update: Record<string, any> = {};
    if (Object.keys(setFields).length > 0) update.$set = setFields;
    if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

    const filter: any = {
      _id: idStr ? new mongoose.Types.ObjectId(idStr) : new mongoose.Types.ObjectId(),
    };

    validNodeIndexes.push(index);
    operations.push({
      updateOne: {
        filter,
        update,
        upsert: true,
      },
    });
  });

  if (operations.length === 0) return { ids: [], serverTime: now };

  const result = await Node.bulkWrite(operations, { ordered: true });

  if (hasPageChanges) {
    invalidateUserPagesCache(userId);
  }

  const upsertedByOriginalIndex = new Map<number, string>();
  validNodeIndexes.forEach((origIdx, opIdx) => {
    const upsertedId = result.upsertedIds[opIdx];
    const resolvedId = upsertedId
      ? upsertedId.toString()
      : nodes[origIdx]._id;
    upsertedByOriginalIndex.set(origIdx, resolvedId);
  });

  const ids = nodes.map((node: any, idx: number) =>
    upsertedByOriginalIndex.get(idx) ?? node._id,
  );

  // Автоматическая синхронизация слепка `out` для страниц, внутри которых изменились ноды
  const affectedPageIds = new Set<string>();
  for (const idx of validNodeIndexes) {
    const node = nodes[idx];
    if (node.pageId && isValidObjectId(String(node.pageId))) {
      affectedPageIds.add(String(node.pageId));
    }
  }
  for (const pId of affectedPageIds) {
    await syncPageOutSnapshot(pId);
  }

  return { ids, serverTime: now };
}

export async function deleteNodeById(id: string, userId?: string) {
  if (!userId || !isValidObjectId(userId) || !isValidObjectId(id)) return null;
  const ownedPages = await getUserOwnedPageIds(userId);
  const existing = await Node.findById(id).select("_id pageId userId type").lean();
  if (!existing) return null;

  const isOwned = existing.pageId
    ? ownedPages.has(String(existing.pageId))
    : (existing.userId && String(existing.userId) === userId) ||
      ownedPages.has(String(existing._id));
  if (!isOwned) return null;

  const deleted = await Node.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
  });
  if (deleted?.type === 4) {
    invalidateUserPagesCache(userId);
  }
  if (deleted?.pageId && isValidObjectId(String(deleted.pageId))) {
    await syncPageOutSnapshot(String(deleted.pageId));
  }
  return deleted;
}

export async function deleteNodesByIds(ids: string[], userId?: string) {
  if (!userId || !isValidObjectId(userId)) {
    return { deletedCount: 0 };
  }
  const objectIds = ids
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (objectIds.length === 0) {
    return { deletedCount: 0 };
  }

  const ownedPages = await getUserOwnedPageIds(userId);
  const docs = await Node.find({ _id: { $in: objectIds } })
    .select("_id pageId userId type")
    .lean();

  const allowedIds: mongoose.Types.ObjectId[] = [];
  let hasDeletedPage = false;

  for (const doc of docs) {
    const isOwned = doc.pageId
      ? ownedPages.has(String(doc.pageId))
      : (doc.userId && String(doc.userId) === userId) ||
        ownedPages.has(String(doc._id));
    if (isOwned) {
      allowedIds.push(doc._id);
      if (doc.type === 4) hasDeletedPage = true;
    }
  }

  if (allowedIds.length === 0) {
    return { deletedCount: 0 };
  }

  const res = await Node.deleteMany({ _id: { $in: allowedIds } });
  if (hasDeletedPage) {
    invalidateUserPagesCache(userId);
  }
  return res;
}

export async function findQuickTargets(
  marker: string = ">>",
  pageId?: string,
): Promise<QuickTargetItem[]> {
  const safeMarker = String(marker || ">>").slice(0, 64);
  const escapedMarker = safeMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const query: any = {
    title: { $regex: escapedMarker },
    inTrash: { $ne: true },
  };

  if (pageId) {
    if (pageId === "root") {
      query.pageId = null;
    } else if (isValidObjectId(pageId)) {
      query.pageId = new mongoose.Types.ObjectId(pageId);
    }
  }

  const nodes = await Node.find(query).select("_id title pageId s L").lean();

  return nodes.map((n) => {
    const rawTitle = n.title || "";
    const cleanTitle = rawTitle.replace(safeMarker, "").trim();
    const parentLID = (n.s || 0) & 0x1ffff;
    return {
      _id: n._id,
      title: rawTitle,
      cleanTitle: cleanTitle || rawTitle,
      parentLID,
      pageId: n.pageId ? n.pageId.toString() : "root",
    };
  });
}

export async function createQuickNode(input: QuickAddNodeInput) {
  const {
    rawText,
    customParentTitle,
    customPageId,
    customParentLID,
    customTab,
    customIndex,
    customUserId,
    customS,
  } = input;

  let targetPageId = customPageId || "6a217eec3f6bb77979b18240";
  let targetParentLID = customParentLID !== undefined ? customParentLID : 136;
  const targetTab = customTab !== undefined ? customTab : 1;

  // Поиск родителя по названию
  if (customParentTitle && customParentLID === undefined) {
    const cleanParentSearch = customParentTitle.trim();
    const escaped = cleanParentSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parentFilter: any = {
      title: { $regex: escaped, $options: "i" },
      inTrash: { $ne: true },
    };
    if (customPageId) {
      parentFilter.pageId =
        customPageId === "root"
          ? null
          : new mongoose.Types.ObjectId(customPageId);
    }
    const parentNode = await Node.findOne(parentFilter);
    if (parentNode) {
      targetPageId = parentNode.pageId
        ? parentNode.pageId.toString()
        : "root";
      let pLID = extractLIDFromS(parentNode.s);
      if (!pLID) {
        const pageNodesForLID = await Node.find({
          pageId: parentNode.pageId ?? null,
          inTrash: { $ne: true },
        })
          .select("s")
          .lean();
        let maxLID = 0;
        for (const n of pageNodesForLID) {
          const curLID = extractLIDFromS(n.s);
          if (curLID > maxLID) maxLID = curLID;
        }
        pLID = maxLID + 1;
        parentNode.s = patchLIDInS(parentNode.s, pLID);
        await parentNode.save();
      }
      targetParentLID = pLID;
    }
  }

  const isRoot = !targetPageId || targetPageId === "root";
  const pageFilter = isRoot
    ? null
    : new mongoose.Types.ObjectId(targetPageId);

  let targetUserId: any = isRoot ? customUserId : undefined;
  if (isRoot && !targetUserId) {
    const user = await User.findOne().select("_id").lean();
    targetUserId = user?._id;
  }

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

  const finalIndex =
    customIndex !== undefined
      ? customIndex
      : maxChildIndex !== -1
        ? maxChildIndex + 1
        : customParentTitle || customParentLID !== undefined
          ? 1
          : 22;

  // Упаковываем L: tab (3 бита), index (12 бит), parentLID (17 бит)
  const newL = packL(targetTab, finalIndex, targetParentLID);

  const nodeData: Record<string, any> = {
    title: rawText,
    type: 1, // TEXT_EDIT
    pageId: pageFilter,
    L: newL,
    lastUpdate: new Date(),
  };

  if (customS !== undefined) {
    nodeData.s = (customS >>> 0);
  }

  if (targetUserId) {
    nodeData["userId"] = new mongoose.Types.ObjectId(targetUserId);
  }

  const newNode = new Node(nodeData);
  await newNode.save();

  if (!isRoot && isValidObjectId(targetPageId)) {
    await syncPageOutSnapshot(targetPageId);
  }

  return {
    _id: newNode._id,
    title: newNode.title,
    type: newNode.type,
    L: newL,
    parentLID: targetParentLID,
    tab: targetTab,
    index: finalIndex,
    pageId: targetPageId,
  };
}
