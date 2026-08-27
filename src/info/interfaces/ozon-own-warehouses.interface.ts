export interface OzonOwnWarehouses {
  warehouses: {
    warehouse_id: number;
    name: string;
    is_rfbs?: boolean;
    status?: string;
    has_entrusted_acceptance?: boolean;
    is_kgt?: boolean;
  }[];
}
