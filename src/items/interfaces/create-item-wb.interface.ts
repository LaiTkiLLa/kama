export interface CreateItemWb {
  subjectID: number;
  variants: [
    {
      vendorCode: string;
      kizMarked?: boolean;
      wholesale?: {
        enabled?: boolean;
        quantum?: number;
      };
      title?: string;
      description?: string;
      brand?: string;
      //Указываем в см
      dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        //Указываем в кг
        weightBrutto?: number;
      };
      characteristics?: {
        id: number;
        value: string[];
      }[];
      sizes?: {
        techSize?: string;
        wbSize?: string;
        price?: number;
        skus?: string[];
      }[];
    }
  ];
}
