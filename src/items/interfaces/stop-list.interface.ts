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
  classification: string
}
