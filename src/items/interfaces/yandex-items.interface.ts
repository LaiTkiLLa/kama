export interface YandexItems {
  status: string;
  result: {
    paging: {};
    offerMappings: {
      offer: {
        offerId: string;
        name: string;
        category: string;
        pictures: string[];
        vendor: string;
        barcodes: string[];
        description: string;
        manufacturerCountries: [];
        weightDimensions: [];
        vendorCode: string;
        guaranteePeriod: [];
        customsCommodityCode: string;
        commodityCodes: [];
        params: [];
        basicPrice: [];
        cardStatus: string;
        campaigns: [];
        sellingPrograms: [];
        mediaFiles: [];
      };
      mapping: {
        marketSku: number;
        marketSkuName: string;
        marketModelId: number;
        marketModelName: string;
        marketCategoryId: number;
        marketCategoryName: string;
      };
    }[];
  };
}
