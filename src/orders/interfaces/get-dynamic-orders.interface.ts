export interface GetDynamicOrders {
  supplierArticle: string;
  sku: number;
  orders: number;
  barcode: string;
  reserved: number;
  promiseAmount: number;
  quantityFull: number;
  ordersSum: number;
  ordersLastNinetyDays: number;
  ordersLastThirtyDays: number;
}
