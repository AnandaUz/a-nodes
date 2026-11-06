import mongoose from "mongoose";
import { Node } from "../models/Node";
import { User } from "../models/User";

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

  const isDelta = Boolean(since && !isNaN(since.getTime()));

  // Поиск страничных нод на текущей доске (type === 4) и подгрузка узлов их OUT-фреймов
  const deskPageNodes = isDelta
    ? await Node.find({
        pageId: pageFilter,
        type: 4,
        inTrash: { $ne: true },
      }).lean()
    : nodes.filter((n: any) => n.type === 4);

  if (deskPageNodes.length > 0) {
    const pageIdsOnDesk = deskPageNodes.map((p: any) => p._id);
    const outFrames = await Node.find({
      pageId: { $in: pageIdsOnDesk },
      o: true,
      inTrash: { $ne: true },
    }).lean();

    if (outFrames.length > 0) {
      const pageIdsWithOutFrames = outFrames.map((f: any) => f.pageId);
      const subNodes = await Node.find({
        pageId: { $in: pageIdsWithOutFrames },
        inTrash: { $ne: true },
        ok: { $ne: true },
      })
        .select(exStr)
        .lean();

      const pageNodeOnDeskById = new Map<string, any>();
      for (const pn of deskPageNodes) {
        pageNodeOnDeskById.set(String(pn._id), pn);
      }

      const nodesByPageId = new Map<string, any[]>();
      for (const sn of subNodes) {
        const key = String(sn.pageId);
        let arr = nodesByPageId.get(key);
        if (!arr) {
          arr = [];
          nodesByPageId.set(key, arr);
        }
        arr.push(sn);
      }

      const outNodesToAdd: any[] = [];
      const existingIds = new Set(nodes.map((n: any) => String(n._id)));

      for (const frame of outFrames) {
        const pIdStr = String(frame.pageId);
        const deskPageNode = pageNodeOnDeskById.get(pIdStr);
        if (!deskPageNode) continue;

        const outFrameLID = (frame.s || 0) & 0x1ffff;
        let pageDeskLID = (deskPageNode.s || 0) & 0x1ffff;
        if (!pageDeskLID) {
          const maxLID = Math.max(0, ...nodes.map((n: any) => (n.s || 0) & 0x1ffff));
          pageDeskLID = maxLID + 1;
          deskPageNode.s = pageDeskLID;
          const nodeInDesk = nodes.find((n: any) => String(n._id) === pIdStr);
          if (nodeInDesk) {
            nodeInDesk.s = pageDeskLID;
          }
          await Node.updateOne({ _id: deskPageNode._id }, { $set: { s: pageDeskLID } });
        }

        const nodesOfPage = nodesByPageId.get(pIdStr) || [];

        const childrenByParentLID = new Map<number, any[]>();
        for (const n of nodesOfPage) {
          if (n.L === undefined || n.L === null) continue;
          const parentLID = (n.L >> 15) & 0x1ffff;
          if (parentLID > 0) {
            let children = childrenByParentLID.get(parentLID);
            if (!children) {
              children = [];
              childrenByParentLID.set(parentLID, children);
            }
            children.push(n);
          }
        }

        const collectedLIDs = new Set<number>([outFrameLID]);
        const queue: number[] = [outFrameLID];
        while (queue.length > 0) {
          const currentLID = queue.shift()!;
          const children = childrenByParentLID.get(currentLID);
          if (!children) continue;
          for (const child of children) {
            const nodeLID = (child.s || 0) & 0x1ffff;
            if (nodeLID > 0 && !collectedLIDs.has(nodeLID)) {
              collectedLIDs.add(nodeLID);
              queue.push(nodeLID);
            }
          }
        }

        for (const n of nodesOfPage) {
          const nodeLID = (n.s || 0) & 0x1ffff;
          const origParentLID = ((n.L || 0) >> 15) & 0x1ffff;
          if (nodeLID !== outFrameLID && origParentLID > 0 && collectedLIDs.has(origParentLID)) {
            const copy: any = { ...n };
            copy.isLockedInOutFrame = true;
            copy.outFrameLID = outFrameLID;

            if (origParentLID === outFrameLID) {
              const tab = (copy.L || 0) & 0x7;
              const index = ((copy.L || 0) >> 3) & 0xfff;
              copy.L = tab | (index << 3) | (pageDeskLID << 15);
            }

            if (!existingIds.has(String(copy._id))) {
              existingIds.add(String(copy._id));
              outNodesToAdd.push(copy);
            }
          }
        }
      }

      nodes.push(...outNodesToAdd);
    }
  }

  // Подгрузка оригиналов для клонов (поле `c`), если оригиналы находятся на других страницах
  const loadedIds = new Set(nodes.map((n: any) => String(n._id)));
  const missingSourceIds = nodes
    .filter((n: any) => n.c && !loadedIds.has(String(n.c)))
    .map((n: any) => new mongoose.Types.ObjectId(n.c));

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

  if (isDelta) {
    return { nodes, pageNode, serverTime: new Date(), breadcrumbs: undefined };
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

  return ids;
}

export async function deleteNodeById(id: string, _userId?: string) {
  const filter: any = { _id: new mongoose.Types.ObjectId(id) };
  return await Node.findOneAndDelete(filter);
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
