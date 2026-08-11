import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  contact: string;

  @IsString()
  @IsOptional()
  contract: string;

  @IsString()
  @IsOptional()
  paymentTerms: string;

  @IsString()
  @IsOptional()
  typeOfMutualSettlements: string;

  @IsString()
  @IsOptional()
  legalTitle: string;

  @IsString()
  @IsOptional()
  legalAddress: string;

  @IsString()
  @IsOptional()
  accRaschet: string;

  @IsString()
  @IsOptional()
  reliabilityRating: string;

  @IsString()
  @IsOptional()
  warehouseAddress: string;

  @IsString()
  @IsOptional()
  responsibleEmployee: string;

  @IsString()
  @IsOptional()
  comment: string;

  @IsString()
  @IsOptional()
  creditLimit: string;

  @IsBoolean()
  @IsOptional()
  canBeAbleToStoreInWarehouse: boolean;

  @IsNumber()
  @IsOptional()
  numberOfStorageDays: number;

  @IsString()
  @IsOptional()
  webSite: string;

  @IsNumber()
  @IsOptional()
  rank: number;

  // title банка — резолвится в bankId на стороне сервиса
  @IsString()
  @IsOptional()
  bank: string;
}
