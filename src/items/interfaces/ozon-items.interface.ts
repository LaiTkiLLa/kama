export interface OzonItems {
  items: [
    {
      archived: boolean;
      has_fbo_stocks: boolean;
      has_fbs_stocks: boolean;
      is_discounted: boolean;
      offer_id: string;
      product_id: number;
      quants: [
        {
          quant_code: string;
          quant_size: number;
        }
      ];
    }
  ];
  total: number;
  last_id: string;
}

export interface OzomItemsInfo {
  items: {
    id: number;
    name: string;
    offer_id: string;
    is_archived: boolean;
    is_autoarchived: boolean;
    barcodes: string[];
    description_category_id: number;
    type_id: number;
    created_at: string;
    images: [];
    currency_code: string;
    marketing_price: string;
    min_price: string;
    old_price: string;
    price: string;
    sources: { sku: number }[];
    model_info: [];
    commissions: [];
    is_prepayment_allowed: boolean;
    volume_weight: number;
    has_discounted_fbo_item: boolean;
    is_discounted: boolean;
    discounted_fbo_stocks: number;
    stocks: [];
    errors: [];
    updated_at: string;
    vat: string;
    visibility_details: [];
    price_indexes: [];
    images360: [];
    is_kgt: boolean;
    color_image: [];
    primary_image: string[];
    statuses: [];
    is_super: boolean;
    is_seasonal: boolean;
  }[];
}
