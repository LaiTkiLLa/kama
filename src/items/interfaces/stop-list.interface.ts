export interface StopListResponse {
  article: string;
  image: string;
  title: string;
  color: string;
  marketplace: {
    id: number;
    title: string;
    orders: number;
    stocks: number;
    itemId: number;
    wbBarcode: string;
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
}
