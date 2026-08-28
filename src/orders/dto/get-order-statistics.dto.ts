export interface GetOrderStatisticsDto {
  dateFrom: Date;
  dateTo: Date;
  marketplaceId?: number;
  warehouseId?: number;
}

export interface OrderStatistics {
  ordersCount: number;
  totalQuantity: number;
  totalPrice: number;
  totalPayout: number;
}
