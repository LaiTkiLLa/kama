export interface GetOrdersYandex {
  result: {
    orders: {
      id: number;
      creationDate: string;
      statusUpdateDate: string;
      status: string;
      partnerOrderId: string;
      paymentType: string;
      fake: boolean;
      deliveryRegion: { id: number; name: string };
      items: [
        {
          offerName: string;
          marketSku: number;
          shopSku: string;
          count: number;
          warehouse: {
            id: number;
            name: string;
          };
          prices: [{ type: string; total: number }];
          details: [];
          cisList: [];
        }
      ];
      payments: [
        {
          id: string;
          date: string;
          type: string;
          source: string;
          total: number;
          paymentOrder: [];
        }
      ];
      commissions: [
        { type: string; actual: number },
        { type: string; actual: number },
        { type: string; actual: number },
        { type: string; actual: number }
      ];
      subsidies: [{ operationType: string; type: string; amount: number }];
      buyerType: string;
      currency: string;
    }[];
    paging: {
      nextPageToken: string;
    };
  };
}

export interface YandexOrderInfo {
  orderId: string;
  marketSku: number;
  shopSku: string;
  count: number;
  orderDate: string;
  warehouseId: string;
  orderSum: number;
  isCancel: boolean;
}
