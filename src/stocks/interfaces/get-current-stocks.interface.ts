export interface GetCurrentStocks {
  nmId: number,
  supplierArticle: string,
  barcode: number,
  orders: number,
  orderLastMonth: number,
  imageUrl: string,
  inWayToClient
  inWayFromClient
  quantityFull
  ordersSum: number,
  inAcceptance: number,
  salesSpeed: number,
  planTime: number,
  assemblyPeriod: number,
  deliveryTime: number,
  shipmentTime: number,
  reserve: number,
  reserveInPercent: number,
  cost: number,
  growthPercent: number,
  salePrice: number,
  supplier: string,
  middlePrice: number,
  itemId: number
}