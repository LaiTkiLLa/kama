export interface WbItems {
  cards: WbItem[];
  cursor: {
    updatedAt: string;
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
  dimensions: [];
  photos: { big: string }[];
  characteristics: [{ id: number; name: string; value: string[] }];
  sizes: [];
  createdAt: string;
  updatedAt: string;
}
