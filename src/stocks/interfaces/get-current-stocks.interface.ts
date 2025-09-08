export interface GetCurrentStocks {
  nmId: number;
  supplierArticle: string;
  barcode: number;
  orders: number;
  orderLastMonth: number;
  imageUrl: string;
  inWayToClient;
  sku: string;
  inWayFromClient;
  quantityFull;
  ordersSum: number;
  inAcceptance: number;
  salesSpeed: number;
  planTime: number;
  assemblyPeriod: number;
  deliveryTime: number;
  shipmentTime: number;
  reserve: number;
  reserveInPercent: number;
  cost: number;
  growthPercent: number;
  salePrice: number;
  supplier: string | null;
  middlePrice: number;
  itemId: number;
  color: string;
  classification: string;
  multiplicity: string;
  boxNumber: string;
  supplierOldArticle: string;
  category: string
}
