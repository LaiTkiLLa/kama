export interface GetDynamicOrders {
  itemId: number;
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
  ordersThirdDays: number;
  ordersLastWeek: number;
  reserve: number;
  speedSales: number;
  ordersLastFourteenDays: number;
  ordersLastFifteenDays: number;
  ordersLastSixtyDays: number;
  ordersLastTwentyOneDays: number;
  totalOrdersAboveAvg: number;
  daysAboveAvg: number;
  speedSalesAboveAvg: number
}
