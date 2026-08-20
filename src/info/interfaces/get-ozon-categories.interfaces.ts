export interface OzonCategoryTypeNode {
  type_id: number;
  type_name: string;
  disabled: boolean;
  children: [];
}

export interface OzonCategoryNode {
  description_category_id: number;
  category_name: string;
  disabled: boolean;
  children: OzonCategoryTypeNode[];
}

export interface OzonCategoryRootNode {
  description_category_id: number;
  category_name: string;
  disabled: boolean;
  children: OzonCategoryNode[];
}

export interface GetOzonCategoriesResponse {
  result: OzonCategoryRootNode[];
}
