export interface CreateItemWbVariant {
  vendorCode: string;
  kizMarked?: boolean;
  wholesale?: {
    enabled?: boolean;
    quantum?: number;
  };
  title?: string;
  description?: string;
  brand?: string;
  // Указываем в см
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    // Указываем в кг
    weightBrutto?: number;
  };
  characteristics?: {
    id: number;
    value: string[];
  }[];
  sizes: {
    techSize?: string;
    wbSize?: string;
    price?: number;
    skus: string[];
  }[];
}

/** Один элемент POST /content/v2/cards/upload (1..30 variants = объединённая карточка). */
export interface CreateItemWb {
  subjectID: number;
  variants: CreateItemWbVariant[];
}

/** Request body: массив карточек; для отдельной карточки — один объект с одним variant. */
export type WbCardsUploadBody = CreateItemWb[];

export interface GenerateBarcodesResponse {
  data: string[];
  error: boolean;
  errorText: string;
  additionalErrors: string;
}
