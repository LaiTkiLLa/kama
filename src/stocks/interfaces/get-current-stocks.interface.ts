export interface GetCurrentStocks {
  nmId: number;
  supplierArticle: string;
  barcode: number;
  inWayToClient: number;
  inWayFromClient: number;
  quantityFull: number;
  id: number
}
