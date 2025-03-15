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

export interface GetOrdersResult {
  sku: string;
  quantity: number;
  sum: string;
  article: string;
  warehouse: string;
  cancelReasonId: number;
  createdAt: string;
  orderId: number;
}
