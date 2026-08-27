export interface FbsStockPushItem {
  /** MP-specific sku: WB barcode / Ozon offer_id */
  sku: string;
  amount: number;
}

export interface FbsStockPublisher {
  readonly marketplaceTitle: string;
  push(warehouseInternalNumber: string, stocks: FbsStockPushItem[]): Promise<void>;
}

export const FBS_STOCK_PUBLISHERS = 'FBS_STOCK_PUBLISHERS';
