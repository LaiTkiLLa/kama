export type MarketplaceInfo = {
  title: string;
  dimensions: string | null;
  volume: string | null;
  sku: string | null;
  marketplaceIdentifier: string | null;
  image: string | null;
  barcode: string;
  color: string | null;
  category: string | null;
  itemTitle: string | null;
  price: number | null;
  discount: number | null;
  priceWithDiscount: number | null;
};

export type SupplierInfo = {
  itemSupplierId: number;
  itemCharacteristicId: number | null;
  sizeValue: string | null;
  title: string;
  multiplicity: string;
  boxNumber: string;
  dimensionsFact: string;
  volume: string;
  costInYuan: number;
  costInYuanWhite: number;
  dimensionsMasterBox: string;
  payment: number;
  assembling: number;
  production: number;
  supplierMinimumOrder: number;
  ownImagesUrl: string | null;
};
