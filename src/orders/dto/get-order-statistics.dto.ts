export interface GetOrderStatisticsDto {
  dateFrom: Date;
  dateTo: Date;
  marketplaceTitle?: string;
  warehouseTitle?: string;
  warehouseType?: 'FBO' | 'FBS';
}

export interface OrderStatistics {
  ordersCount: number;
  totalQuantity: number;
  totalPrice: number;
  totalPayout: number;
}
