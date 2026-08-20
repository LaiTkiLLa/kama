export interface CreateItemOzonVariant {
  description_category_id: number;
  //Артикул
  offer_id: string;
  //Цена товара с учётом скидок, отображается на карточке товара.
  price: number;
  //Идентификатор типа товара.
  type_id: number;
}

export interface CreateItemOzon {
  items: CreateItemOzonVariant[];
}
