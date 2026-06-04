export interface OzonWarehouses {
  warehouses: {
    warehouse_id: number;
    name: string;
    short_name: string;
    address: string;
    timezone: string;
    is_active: boolean;
    warehouse_type: string;
    country_iso_numeric: number;
    is_cross_dock: boolean;
    is_distribution_center: boolean;
    is_express: boolean;
    is_edo: boolean;
    is_for_supply: boolean;
  }[];
}
