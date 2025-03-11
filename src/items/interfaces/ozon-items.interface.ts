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
  last_id: string
}
