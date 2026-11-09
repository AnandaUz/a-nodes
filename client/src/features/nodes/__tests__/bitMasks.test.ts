import { describe, it, expect } from "vitest";
import {
  extractLIDFromS,
  patchLIDInS,
  extractFlagsFromS,
  patchFlagInS,
  packL,
  extractParentLIDFromL,
  toDB,
  fromDB,
  S_BITMASKS,
} from "@shared/types/INodeDB";
import { LNode_TextEdit } from "../LNode/LNode_TextEdit";

describe("Битовые маски и упаковка s / L", () => {
  it("extractLIDFromS корректно извлекает 17-битный lID и безопасен к undefined/null", () => {
    expect(extractLIDFromS(undefined)).toBe(0);
    expect(extractLIDFromS(null)).toBe(0);
    expect(extractLIDFromS(0)).toBe(0);
    expect(extractLIDFromS(1)).toBe(1);
    expect(extractLIDFromS(177)).toBe(177);
    expect(extractLIDFromS(131071)).toBe(131071);
    // если установлены старшие флаги, lID не страдает
    const sWithFlags = 177 | (1 << S_BITMASKS.FRAME_BIT) | (1 << S_BITMASKS.HIDDEN_BD_BIT);
    expect(extractLIDFromS(sWithFlags)).toBe(177);
  });

  it("patchLIDInS меняет только биты lID и сохраняет старшие флаги", () => {
    // Начальное значение: lID = 100 + флаги frame и hiddenBD
    let s = patchLIDInS(0, 100);
    s = patchFlagInS(s, "isFrame", true);
    s = patchFlagInS(s, "hiddenBD", true);

    expect(extractLIDFromS(s)).toBe(100);
    expect(extractFlagsFromS(s).isFrame).toBe(true);
    expect(extractFlagsFromS(s).hiddenBD).toBe(true);

    // Меняем lID на максимальный 131071
    const newS = patchLIDInS(s, 131071);
    expect(extractLIDFromS(newS)).toBe(131071);
    expect(extractFlagsFromS(newS).isFrame).toBe(true);
    expect(extractFlagsFromS(newS).hiddenBD).toBe(true);
    expect(newS).toBeGreaterThan(0);
  });

  it("patchFlagInS переключает флаги независимо друг от друга и от lID", () => {
    let s = patchLIDInS(0, 42);

    s = patchFlagInS(s, "isFrame", true);
    expect(extractFlagsFromS(s).isFrame).toBe(true);
    expect(extractLIDFromS(s)).toBe(42);

    s = patchFlagInS(s, "hiddenBD", true);
    expect(extractFlagsFromS(s).hiddenBD).toBe(true);
    expect(extractFlagsFromS(s).isFrame).toBe(true);

    s = patchFlagInS(s, "isListClosed", true);
    expect(extractFlagsFromS(s).isListOpen).toBe(false);

    // Снимаем isFrame
    s = patchFlagInS(s, "isFrame", false);
    expect(extractFlagsFromS(s).isFrame).toBe(false);
    expect(extractFlagsFromS(s).hiddenBD).toBe(true);
    expect(extractFlagsFromS(s).isListOpen).toBe(false);
    expect(extractLIDFromS(s)).toBe(42);
  });

  it("packL и extractParentLIDFromL корректно работают без знакового переполнения", () => {
    const parentLID = 131071; // максимальный 17-битный
    const L = packL(3, 4095, parentLID);
    expect(L).toBeDefined();
    expect(L!).toBeGreaterThan(0);
    expect(extractParentLIDFromL(L)).toBe(parentLID);
  });

  it("toDB и fromDB сохраняют максимальный lID и комбинацию флагов без искажения", () => {
    const node = new LNode_TextEdit();
    node.lID = 131071;
    node.frame.isFrame = true;
    node.hiddenBD = true;
    node.list.isListOpen = false;

    const db = toDB(node);
    expect(db.s).toBeDefined();
    expect(db.s!).toBeGreaterThan(0);
    expect(extractLIDFromS(db.s)).toBe(131071);

    const restored = new LNode_TextEdit();
    fromDB(db, restored);

    expect(restored.lID).toBe(131071);
    expect(restored.frame.isFrame).toBe(true);
    expect(restored.hiddenBD).toBe(true);
    expect(restored.list.isListOpen).toBe(false);
  });
});

