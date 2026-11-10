export interface IExData {
  /** @deprecated Устаревшее поле привязки владельцев (заменено на LNode.list/frame) */
  ownerNodesIds?: string[] | undefined;
  /** Цвет фона ноды */
  bgColor?: string | undefined;
  /** Цвет текста ноды */
  tColor?: string | undefined;
  /** @deprecated Устаревшее строковое поле повтора (заменено на LNode.repeatMode) */
  repeatMode?: string | undefined;
  /** @deprecated Устаревшая дата повтора (заменено на LNode.repeatMode.date) */
  repeatDay?: Date | undefined;
  /** Внешний URL или ссылка на доску */
  url?: string | undefined;
  /** Заголовок / уровень H1-H6 */
  h?: string | undefined;
  /** Дополнительная высота/параметр заголовка */
  hh?: number | undefined;
}

/**
 * Создаёт санитизированную копию расширенных данных для дублирования/копирования ноды.
 * Копирует только визуальные и контентные атрибуты, исключая устаревшие служебные привязки.
 */
export function cloneExDataForCopy(exData?: IExData | null): IExData | undefined {
  if (!exData) return undefined;
  const result: IExData = {};
  if (exData.bgColor !== undefined) result.bgColor = exData.bgColor;
  if (exData.tColor !== undefined) result.tColor = exData.tColor;
  if (exData.url !== undefined) result.url = exData.url;
  if (exData.h !== undefined) result.h = exData.h;
  if (exData.hh !== undefined) result.hh = exData.hh;
  return Object.keys(result).length > 0 ? result : undefined;
}
