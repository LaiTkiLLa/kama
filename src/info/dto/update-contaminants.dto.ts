import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { BankDto } from './bank.dto';
import { Type } from 'class-transformer';

export class UpdateContaminantsDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  inn: string;

  @IsString()
  @IsOptional()
  kpp: string;

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

  @IsOptional()
  @ValidateNested({ message: 'bank должен передаваться объектом' })
  @Type(() => BankDto)
  bank: BankDto;
}
