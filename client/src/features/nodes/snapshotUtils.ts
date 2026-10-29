import type { INodeDB } from "@shared/types/INodeDB";
import type { DeskSnapshot } from "../core/interfaces";

export function areNodesEqual(a: INodeDB, b: INodeDB): boolean {
  if (a._id !== b._id) return false;
  if (a.type !== b.type) return false;
  if (a.title !== b.title) return false;
  if (Boolean(a.inTrash) !== Boolean(b.inTrash)) return false;
  if (Boolean(a.ok) !== Boolean(b.ok)) return false;
  if ((a.x ?? 0) !== (b.x ?? 0) || (a.y ?? 0) !== (b.y ?? 0)) return false;
  if ((a.L ?? 0) !== (b.L ?? 0)) return false;
  if ((a.s ?? 0) !== (b.s ?? 0)) return false;
  if ((a.A ?? 0) !== (b.A ?? 0)) return false;
  if ((a.D ?? 0) !== (b.D ?? 0)) return false;

  if (Array.isArray(a.f) || Array.isArray(b.f)) {
    if (!Array.isArray(a.f) || !Array.isArray(b.f)) return false;
    if (a.f.length !== b.f.length) return false;
    for (let i = 0; i < a.f.length; i++) {
      if (a.f[i] !== b.f[i]) return false;
    }
  }

  if (a.lastUpdate || b.lastUpdate) {
    const timeA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
    const timeB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
    if (timeA !== timeB) return false;
  }

  const exA = a.exData;
  const exB = b.exData;
  if (!exA && !exB) return true;
  if (!exA || !exB) return false;

  if (
    exA.bgColor !== exB.bgColor ||
    exA.tColor !== exB.tColor ||
    exA.repeatMode !== exB.repeatMode ||
    exA.url !== exB.url ||
    exA.h !== exB.h ||
    exA.hh !== exB.hh
  ) {
    return false;
  }

  const dayA = exA.repeatDay ? new Date(exA.repeatDay).getTime() : 0;
  const dayB = exB.repeatDay ? new Date(exB.repeatDay).getTime() : 0;
  if (dayA !== dayB) return false;

  const ownersA = exA.ownerNodesIds || [];
  const ownersB = exB.ownerNodesIds || [];
  if (ownersA.length !== ownersB.length) return false;
  for (let i = 0; i < ownersA.length; i++) {
    if (ownersA[i] !== ownersB[i]) return false;
  }

  return true;
}

export function areSnapshotsEqual(
  a: DeskSnapshot | null | undefined,
  b: DeskSnapshot | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  if (!a.pageNode && b.pageNode) return false;
  if (a.pageNode && !b.pageNode) return false;
  if (a.pageNode && b.pageNode && !areNodesEqual(a.pageNode, b.pageNode)) {
    return false;
  }

  const nodesA = a.nodes || [];
  const nodesB = b.nodes || [];
  if (nodesA.length !== nodesB.length) return false;

  const mapA = new Map<string, INodeDB>();
  for (const n of nodesA) {
    if (n._id) mapA.set(n._id, n);
  }
  if (mapA.size !== nodesA.length) {
    return false;
  }

  for (const nB of nodesB) {
    if (!nB._id) return false;
    const nA = mapA.get(nB._id);
    if (!nA || !areNodesEqual(nA, nB)) return false;
  }

  return true;
}

