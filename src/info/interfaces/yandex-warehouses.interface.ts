export interface GetYandexWarehouses {
  status: 'OK';
  result: {
    warehouses: { id: number; name: string }[];
  };
}
