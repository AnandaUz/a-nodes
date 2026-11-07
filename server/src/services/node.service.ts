import mongoose from "mongoose";
import { Node } from "../models/Node";
import { User } from "../models/User";
import type { IOutFrameData, IOutNodeItem } from "../../../shared/types/INodeDB";

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
    const nodeLID = (n.s || 0) & 0x1ffff;
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
    const outFrameLID = (frame.s || 0) & 0x1ffff;
    if (!outFrameLID) continue;

    const items: IOutNodeItem[] = [];
    const visited = new Set<number>([outFrameLID]);

    const walk = (pLID: number) => {
      const children = childrenByParentLID.get(pLID) || [];
      children.sort((a, b) => a.index - b.index);
      for (const ch of children) {
        const hiddenBD = Boolean(((ch.raw.s || 0) >> 18) & 1);
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

export async function getNodesAndPageByNodeId(
  nodeId: string,
  _userId?: string,
  since?: Date,
) {
  const isRoot = nodeId === "root";
  const pageFilter = isRoot ? null : new mongoose.Types.ObjectId(nodeId);

  const nodeQuery: any = {
    pageId: pageFilter,
  };

  // Дельта-синхронизация: возвращаем только изменившиеся/удаленные после since
  if (since && !isNaN(since.getTime())) {
    nodeQuery.lastUpdate = { $gt: since };
  } else {
    nodeQuery.$or = [
      { inTrash: { $ne: true }, ok: { $ne: true } },
      { "exData.repeatDay": { $lt: new Date() } },
    ];
  }

  const exStr = since ? "-__v" : "-__v -inTrash -ok";

  const pageQuery: any = isRoot
    ? null
    : { _id: new mongoose.Types.ObjectId(nodeId) };

  const [nodes, pageNode] = await Promise.all([
    Node.find(nodeQuery).select(exStr).lean(),
    pageQuery ? Node.findOne(pageQuery).select("-__v").lean() : null,
  ]);

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

  if (missingSourceIds.length > 0) {
    const missingSources = await Node.find({
      _id: { $in: missingSourceIds },
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

  const breadcrumbs: { id: string; title: string }[] = [];

  let targetPageNode: any = pageNode;
  if (!targetPageNode && !isRoot && isValidObjectId(nodeId)) {
    targetPageNode = await Node.findOne({
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

    let currentParentId = targetPageNode.pageId;
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

      const parentNode = await Node.findOne({ _id: currentParentId })
        .select("_id title pageId")
        .lean();

      if (!parentNode) break;

      breadcrumbs.unshift({
        id: parentNode._id.toString(),
        title: parentNode.title || "",
      });

      currentParentId = parentNode.pageId;
    }
  }

  return { nodes, pageNode, serverTime: new Date(), breadcrumbs };
}

export async function bulkSaveNodes(nodes: any[], userId?: string) {
  if (!nodes || nodes.length === 0) return [];

  const now = new Date();
  const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : undefined;

  const operations = nodes.map((node: any) => {
    const { _id, userId: nodeUserId, ...updateData } = node;

    const setFields: Record<string, any> = {};
    const unsetFields: Record<string, ""> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (value === null) {
        unsetFields[key] = "";
      } else {
        setFields[key] = value;
      }
    }

    const targetUserId =
      userObjectId ||
      (nodeUserId && isValidObjectId(nodeUserId)
        ? new mongoose.Types.ObjectId(nodeUserId)
        : undefined);

    if (targetUserId) {
      setFields.userId = targetUserId;
    }

    if (setFields.c && isValidObjectId(setFields.c)) {
      setFields.c = new mongoose.Types.ObjectId(setFields.c);
    }

    // Дельта-синхронизация: проставляем временную метку обновления
    if (!setFields.lastUpdate) {
      setFields.lastUpdate = now;
    } else {
      setFields.lastUpdate = new Date(setFields.lastUpdate);
    }

    for (const key of Object.keys(setFields)) {
      delete unsetFields[key];
    }

    const update: Record<string, any> = {};
    if (Object.keys(setFields).length > 0) update.$set = setFields;
    if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

    const filter: any = {};
    if (_id && isValidObjectId(_id)) {
      filter._id = new mongoose.Types.ObjectId(_id);
    } else {
      filter._id = new mongoose.Types.ObjectId();
      if (userObjectId) {
        filter.userId = userObjectId;
      }
    }

    return {
      updateOne: {
        filter,
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

  // Автоматическая синхронизация слепка `out` для страниц, внутри которых изменились ноды
  const affectedPageIds = new Set<string>();
  for (const node of nodes) {
    if (node.pageId && isValidObjectId(String(node.pageId))) {
      affectedPageIds.add(String(node.pageId));
    }
  }
  for (const pId of affectedPageIds) {
    await syncPageOutSnapshot(pId);
  }

  return ids;
}

export async function deleteNodeById(id: string, _userId?: string) {
  const filter: any = { _id: new mongoose.Types.ObjectId(id) };
  const deleted = await Node.findOneAndDelete(filter);
  if (deleted?.pageId && isValidObjectId(String(deleted.pageId))) {
    await syncPageOutSnapshot(String(deleted.pageId));
  }
  return deleted;
}

export async function findQuickTargets(
  marker: string = ">>",
  pageId?: string,
): Promise<QuickTargetItem[]> {
  const query: any = {
    title: { $regex: marker },
    inTrash: { $ne: true },
  };

  if (pageId) {
    query.pageId =
      pageId === "root" ? null : new mongoose.Types.ObjectId(pageId);
  }

  const nodes = await Node.find(query).select("_id title pageId s L").lean();

  return nodes.map((n) => {
    const rawTitle = n.title || "";
    const cleanTitle = rawTitle.replace(marker, "").trim();
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
      let pLID = (parentNode.s || 0) & 0x1ffff;
      if (!pLID) {
        const pageNodesForLID = await Node.find({
          pageId: parentNode.pageId ?? null,
          inTrash: { $ne: true },
        })
          .select("s")
          .lean();
        let maxLID = 0;
        for (const n of pageNodesForLID) {
          const curLID = (n.s || 0) & 0x1ffff;
          if (curLID > maxLID) maxLID = curLID;
        }
        pLID = maxLID + 1;
        parentNode.s = ((parentNode.s || 0) & ~0x1ffff) | (pLID & 0x1ffff);
        await parentNode.save();
      }
      targetParentLID = pLID;
    }
  }

  let targetUserId: any = customUserId;
  if (!targetUserId) {
    const adminId = process.env.BOT_ADMIN
      ? Number(process.env.BOT_ADMIN)
      : null;
    let user = adminId
      ? await User.findOne({ telegramId: adminId }).select("_id").lean()
      : null;
    if (!user) {
      user = await User.findOne().select("_id").lean();
    }
    targetUserId = user?._id;
  }

  const isRoot = !targetPageId || targetPageId === "root";
  const pageFilter = isRoot
    ? null
    : new mongoose.Types.ObjectId(targetPageId);

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
  const t = targetTab & 0x7;
  const idx = finalIndex & 0xfff;
  const pLID = targetParentLID & 0x1ffff;
  const newL = (t | (idx << 3) | (pLID << 15)) >>> 0;

  const nodeData: Record<string, any> = {
    title: rawText,
    type: 1, // TEXT_EDIT
    pageId: pageFilter,
    L: newL,
    lastUpdate: new Date(),
  };

  if (customS !== undefined) {
    nodeData.s = customS;
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
