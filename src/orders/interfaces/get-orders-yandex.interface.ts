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
      items: {
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
      }[];
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
      commissions: { type: string; actual: number }[];
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

export interface GetOrdersYandexV2 {
  orders: {
    orderId: number;
    campaignId: number;
    programType: string;
    externalOrderId: string;
    status: string;
    substatus: string;
    creationDate: string;
    updateDate: string;
    paymentType: string;
    paymentMethod: string;
    fake: boolean;
    items: {
      id: number;
      offerId: string;
      offerName: string;
      count: number;
      prices: {
        payment: {
          value: number;
          currencyId: string;
        };
        subsidy: {
          value: number;
          currencyId: string;
        };
        vat: string;
      };
      itemStatuses: [
        {
          status: string;
          count: number;
        }
      ];
    }[];
    prices: {
      payment: {
        value: number;
        currencyId: string;
      };
      subsidy: {
        value: number;
        currencyId: string;
      };
    };
    delivery: {
      type: string;
      serviceName: string;
      deliveryServiceId: number;
      warehouseId: string;
      deliveryPartnerType: string;
      dispatchType: string;
      dates: {
        fromDate: string;
        toDate: string;
        fromTime: string;
        toTime: string;
      };
    };
    buyerType: string;
    cancelRequested: boolean;
    sourcePlatform: string;
  }[];
  paging: {
    nextPageToken: string;
  };
}

export interface YandexOrderInfoV2 {
  warehouseId: string;
  cancelRequested: boolean;
  createdAt: Date;
  orderId: string;
  orderNumber: string;
  status: string;
  substatus: string;
  products: {
    id: string;
    offerId: string;
    name: string;
    quantity: number;
    price: number;
    itemsStatuses: { status: string; count: number }[];
  }[];
}
