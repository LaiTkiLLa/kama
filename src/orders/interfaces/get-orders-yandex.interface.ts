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
          prices: [{ type: string; total: number }];
          warehouse: { id: number; name: string };
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
  warehouse: { id: number; name: string }
  orderSum: number
  isCancel: boolean
}
