export interface MoySkladListMeta {
  href: string;
  type: string;
  size: number;
  limit: number;
  offset: number;
  nextHref?: string;
}

export interface MoySkladEntityMeta {
  href: string;
  type: string;
  mediaType?: string;
}

export interface MoySkladStockAllRow {
  article?: string;
  code: string;
  name: string;
  quantity: number;
  stock: number;
  reserve: number;
  meta: MoySkladEntityMeta;
}

export interface MoySkladListResponse<T> {
  meta: MoySkladListMeta;
  rows: T[];
}

export interface MoySkladCustomerOrder {
  id: string;
  meta: MoySkladEntityMeta;
  externalCode?: string;
  applicable?: boolean;
}
