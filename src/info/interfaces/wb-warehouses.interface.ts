export interface GetWbOwnWarehouses {
  name: string;
  officeId: number;
  id: number;
  cargoType: number;
  deliveryType: number;
  isDeleting: boolean;
  isProcessing: boolean;
}

export interface GetWbWarehouses {
  ID: number;
  name: string;
  address: string;
  workTime: string;
  isActive: boolean;
  isTransitActive: boolean;
}
