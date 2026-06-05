export interface GetOrdersOzon {
  result: {
    order_id: number;
    order_number: string;
    posting_number: string;
    status: string;
    cancel_reason_id: number;
    created_at: string;
    in_process_at: string;
    products: [
      {
        sku: number;
        name: string;
        quantity: number;
        offer_id: string;
        price: string;
        digital_codes: [];
        currency_code: string;
      }
    ];
    analytics_data: {
      region: string;
      city: string;
      delivery_type: string;
      is_premium: boolean;
      payment_type_group_name: string;
      warehouse_id: number;
      warehouse_name: string;
      is_legal: boolean;
    };
    financial_data: [products: [], posting_services: null, cluster_from: string, cluster_to: string];
    additional_data: [];
  }[];
}

export interface GetOrdersOzonV2 {
  has_next: boolean;
  cursor: string;
  postings: {
    posting_number: string;
    order_id: number;
    order_number: string;
    cancel_reason_id: number;
    created_at: string;
    status: string;
    substatus: string;
    products: [
      {
        is_marketplace_buyout: boolean;
        offer_id: string;
        name: string;
        sku: number;
        quantity: number;
        price: {
          amount: string;
          currency: string;
        };
        digital_codes: [];
      }
    ];
    analytics_data: {
      city: string;
      delivery_type: string;
      is_premium: boolean;
      payment_type_group_name: string;
      warehouse_id: number;
      warehouse_name: string;
      is_legal: boolean;
    };
    financial_data: {
      products: {
        //Выплата продавцу.
        payout: number;
        product_id: number;
        //Цена до учёта скидок. На карточке товара отображается зачёркнутой.
        old_price: number;
        //Цена товара с учётом акций, кроме акций за счёт Ozon.
        price: number;
        //Сумма скидки.
        total_discount_value: number;
        //Процент скидки.
        total_discount_percent: number;
        actions: string[];
        commission: {
          amount: number;
          percent: number;
          currency: string;
        };
      }[];
      cluster_from: string;
      cluster_to: string;
    };
    additional_data: [];
  }[];
}

export interface GetOrdersResult {
  warehouseId: number;
  warehouseTitle: string;
  cancelReasonId: number;
  createdAt: string;
  orderId: number;
  postingNumber: string;
  orderNumber: string;
  status: string;
  substatus: string;
  city: string;
  products: {
    offerId: string;
    name: string;
    sku: number;
    quantity: number;
    //Цена товара с учётом акций, кроме акций за счёт Ozon.
    price: number;
    //Выплата продавцу.
    payout: number;
    //Цена до учёта скидок. На карточке товара отображается зачёркнутой.
    oldPrice: number;
    //Сумма скидки.
    totalDiscountValue: number;
    //Процент скидки
    totalDiscountPercent: number;
    clusterFrom: string;
    clusterTo: string;
    commission: {
      amount: number;
      percent: number;
    };
  }[];
}
