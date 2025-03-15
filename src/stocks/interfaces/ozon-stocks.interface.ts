export interface OzonStocks {
  result: {
    rows: {
      sku: number;
      warehouse_name: string;
      item_code: string;
      item_name: string;
      promised_amount: number;
      free_to_sell_amount: number;
      reserved_amount: number;
      idc: number;
    }[];
  };
}

export interface StocksResult {
  article: string;
  sku: string;
  reserved: number;
  current: number;
  promised: number
  warehouse: string;
}
