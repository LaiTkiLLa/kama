export interface GetWbStocks {
  lastChangeDate: string;
  warehouseName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  quantity: number;
  inWayToClient: number;
  inWayFromClient: number;
  quantityFull: number;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  Price: number;
  Discount: number;
  isSupply: boolean;
  isRealization: boolean;
  SCCode: string;
}

export interface GetWbOwnWarehousesStocks {
  stocks: {
    sku: string;
    chrtId: number;
    amount: number;
  }[];
}

export interface GetWbStocksV2 {
  data: {
    items: {
      nmId: number;
      chrtId: number;
      warehouseId: number;
      warehouseName: string;
      regionName: string;
      quantity: number;
      inWayToClient: number;
      inWayFromClient: number;
    }[];
  };
}
