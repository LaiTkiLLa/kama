export interface GetOrdersWb {
  //Время указано московское, как я понимаю, нарпимер 2026-06-04T03:46:05
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  warehouseType: string;
  countryName: string;
  oblastOkrugName: string;
  regionName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  incomeID: number;
  isSupply: boolean;
  isRealization: boolean;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  isCancel: false;
  cancelDate: string;
  orderType: string;
  sticker: string;
  gNumber: string;
  srid: string;
}

export interface GetNewFbsTasksWb {
  orders: {
    salePrice: number;
    requiredMeta: [];
    optionalMeta: string[];
    deliveryType: string;
    comment: string;
    orderUid: string;
    article: string;
    colorCode: string;
    rid: string;
    createdAt: string;
    offices: string[];
    skus: string[];
    id: number;
    warehouseId: number;
    nmId: number;
    chrtId: number;
    price: number;
    convertedPrice: number;
    currencyCode: number;
    convertedCurrencyCode: number;
    cargoType: number;
    crossBorderType: number;
    isZeroOrder: boolean;
    options: {
      isB2B: boolean;
    };
    isPickupPointShipmentAllowed: boolean;
    officeId: number;
    finalPrice: number;
    convertedFinalPrice: number;
  }[];
  next: number;
}
