export interface GetStopListFromDb {
  itemId: number;
  article: string;
  imageUrl: string;
  title: string;
  color: string;
  barcode: string;
  marketplaceIdentifier: string;
  sku: string;
  directionId: number;
  directionTitle: string;
  marketplaceId: number;
  marketplaceTitle: string;
  sendStatusId: number;
  sendStatusTitle: string;
  stocksSum: string;
  ordersSum: string;
}

export interface StopListResponse {
  article: string;
  image: string | null;
  title: string;
  color: string;
  wbBarcode: string | null;
  wbIdentifier: string | null;
  ozonIdentifier: string | null;
  marketplace: {
    id: number;
    title: string;
    orders: number;
    stocks: number;
    itemId: number;
    sendStatus: {
      id: number;
      title: string;
    };
  }[];
  direction: {
    id: number;
    title: string;
  };
}

export interface StopListCronResult {
  orders: number;
  stocks: number;
  itemId: number;
  classification: string;
  itemArticle: string;
}
