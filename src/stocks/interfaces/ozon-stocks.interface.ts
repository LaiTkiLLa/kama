export interface OzonStocks {
  items: {
    offer_id: string;
    product_id: number;
    stocks: {
      present: number;
      reserved: number;
      shipment_type: string;
      sku: number;
      type: string;
    }[];
  }[];
}

export interface StocksResult {
  article: string,
  category: string,
  title: string,
  barcode: string,
  marketplaceIdentifier: number,
  reserved: number,
  present: number,
  marketplaceId: number
}
