export interface GetYandexStocks {
  status: 'OK';
  result: {
    paging: {
      nextPageToken?: string;
    };
    warehouses: {
      warehouseId: number;
      offers: {
        offerId: string;
        turnoverSummary: { turnover: string; turnoverDays: number };
        stocks: { type: ItemTypes; count: number }[];
      }[];
    }[];
  };
}

export enum ItemTypes {
  FIT = 'FIT',
  AVAILABLE = 'AVAILABLE',
  UTILIZATION = 'UTILIZATION',
  DEFECT = 'DEFECT',
  QUARANTINE = 'QUARANTINE',
  EXPIRED = 'EXPIRED'
}
