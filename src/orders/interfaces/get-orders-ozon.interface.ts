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
    //Указано в 0 часом поясе, для Москвы нужно +3 часа
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

export interface GetOrdersFbsOzon {
  has_next: boolean;
  cursor: string;
  postings: {
    posting_number: string;
    order_id: number;
    order_number: string;
    pickup_code_verified_at: null;
    status: string;
    substatus: string;
    delivery_method?: {
      id: number;
      name: string;
      warehouse_id: number;
      warehouse: string;
      tpl_provider_id: number;
      tpl_provider: string;
    } | null;
    delivery_schema: string;
    tracking_number: string;
    tpl_integration_type: string;
    in_process_at?: string;
    shipment_date: string;
    shipment_date_without_delay: string;
    optional: {
      products_with_possible_mandatory_mark: [];
    };
    cancellation?: {
      cancel_reason_id: number;
      cancel_reason: string;
      cancellation_type: string;
      cancelled_after_ship: boolean;
      affect_cancellation_rating: boolean;
      cancellation_initiator: string;
    } | null;
    customer: null;
    products?: {
      is_blr_traceable: boolean;
      is_marketplace_buyout: boolean;
      offer_id: string;
      name: string;
      sku: number;
      quantity: number;
      imei: [];
      weight: number;
      product_color: string;
      price?: {
        amount: number | string;
        currency: string;
      } | null;
    }[];
    addressee: null;
    barcodes: null;
    analytics_data?: {
      region: string;
      city: string;
      delivery_type: string;
      is_premium: boolean;
      payment_type_group_name: string;
      warehouse_id: number;
      warehouse: string;
      tpl_provider_id: number;
      tpl_provider: string;
      delivery_date_begin: string;
      delivery_date_end: string;
      is_legal: boolean;
      client_delivery_date_begin: string;
    } | null;
    destination_place_id: number;
    destination_place_name: string;
    financial_data?: {
      products?: {
        payout: number;
        product_id: number;
        old_price: number;
        price: number;
        total_discount_value: number;
        total_discount_percent: number;
        quantity: number;
        customer_price: {
          amount: string;
          currency: string;
        };
        actions: string[];
        commission?: {
          amount: number;
          percent: number;
          currency: string;
        };
      }[];
      cluster_from: string;
      cluster_to: string;
    } | null;
    is_express: boolean;
    legal_info: null;
    quantum_id: number;
    require_blr_traceable_attrs: boolean;
    requirements: {
      products_requiring_gtd: [];
      products_requiring_country: [];
      products_requiring_mandatory_mark: [];
      products_requiring_rnpt: [];
      products_requiring_jw_uin: [];
      products_requiring_change_country: [];
      products_requiring_imei: [];
      products_requiring_weight: [];
    };
    tariffication: null;
    external_order: {
      is_external: boolean;
      platform_name: string;
    };
    volume_weight: number;
    is_click_and_collect: boolean;
    delivering_date: string;
    is_multibox: boolean;
    multi_box_qty: number;
    is_presortable: boolean;
    prr_option: string;
    parent_posting_number: string;
    available_actions: [];
    tariffication_steps: [];
    container_sort_type: string;
    container: null;
    integration_type_flow: string;
    sorting_center: null;
    received_at_sorting_center: string;
  }[];
}
