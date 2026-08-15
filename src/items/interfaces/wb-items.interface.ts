export interface WbItems {
  cards: WbItem[];
  cursor: {
    updatedAt: string;
    nmID: number;
    total: number;
  };
}

export interface WbTrashedItems {
  cards: WbItem[];
  cursor: {
    trashedAt: string;
    nmID: number;
    total: number;
  };
}

export interface WbItem {
  nmID: number;
  imtID: number;
  nmUUID: string;
  subjectID: number;
  subjectName: string;
  vendorCode: string;
  brand: string;
  title: string;
  needKiz: boolean;
  dimensions: {
    width: number;
    height: number;
    length: number;
    weightBrutto: number;
  };
  photos?: { big: string }[];
  characteristics?: { id: number; name: string; value: string[] }[];
  sizes: {
    chrtID: number;
    techSize: string;
    wbSize: string;
    skus: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface WbItemsPrices {
  data: {
    listGoods: {
      nmID: number;
      vendorCode: string;
      sizes: {
        sizeID: number;
        price: number;
        discountedPrice: number;
        clubDiscountedPrice: number;
        techSizeName: string;
      }[];
      currencyIsoCode4217: string;
      discount: number;
      clubDiscount: number;
      editableSizePrice: boolean;
    }[];
  };
}
