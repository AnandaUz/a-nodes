export interface INode {
  _id?: string | undefined;
  userId?: string | undefined;
  pageId?: string | undefined;
  inTrash?: boolean | undefined;
  lastUpdate?: Date | undefined;
  type?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
  title?: string | undefined;
  ok?: boolean | undefined;

  lID?: number | undefined;
  listData?:
    | {
        parentLID?: number; // локальный ади родителя
        index?: number;
      }
    | undefined;
  exData?:
    | {
        ownerNodesIds?: string[] | undefined;
        bgColor?: string | undefined;
        tColor?: string | undefined;
        repeatMode?: string | undefined;
        repeatDay?: Date | undefined;
        url?: string | undefined;
        h?: string | undefined; // поле для заголовков
        hh?: number | undefined; // поле для высоты блока
      }
    | undefined;
}
