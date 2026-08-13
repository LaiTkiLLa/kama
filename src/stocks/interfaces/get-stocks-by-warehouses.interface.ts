export interface GetStocksByWarehouses {
  id: number;
  itemId: number;
  article: string;
  chrtId: number;
  title: string | null;
  stocks: {
    warehouse: {
      id: string;
      title: string;
      type: string;
    };
    inWayToClient: number;
    inWayFromClient: number;
    quantityFull: number;
  }[];
}
