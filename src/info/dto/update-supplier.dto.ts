import { IsString } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  title: string;

  @IsString()
  contact: string;

  @IsString()
  paymentTerms: string;

  @IsString()
  typeOfMutualSettlements: string;

  @IsString()
  legalTitle: string;

  @IsString()
  legalAddress: string;

  @IsString()
  reliabilityRating: string;

  @IsString()
  warehouseAddress: string;

  @IsString()
  responsibleEmployee: string;

  @IsString()
  comment: string;

  @IsString()
  creditLimit: string;
}
