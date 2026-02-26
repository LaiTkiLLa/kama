export interface OzonItemsInfo {
  id: number;
  barcode: string;
  name: string;
  offer_id: string;
  height: number;
  depth: number;
  width: number;
  dimension_unit: string;
  weight: number;
  weight_unit: string;
  description_category_id: number;
  type_id: number;
  primary_image: string;
  model_info: {
    model_id: number;
    count: number;
  };
  color_image: string;
  sku: number;
  barcodes: string[];
}

export interface OzonCategoryData {
  description_category_id: number;
  category_name: string;
  disabled: boolean;
  children: {
    description_category_id: number
    category_name: string
    children: {
      type_id: number;
      type_name: string;
      disabled: boolean;
      children: [];
    }[];
  }[]

}
