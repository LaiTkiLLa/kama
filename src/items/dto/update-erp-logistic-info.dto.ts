import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateErpLogisticInfoDto {
  @IsNumber()
  @IsOptional()
  consolidation: number;

  @IsNumber()
  @IsOptional()
  daysDeliveryToRussia: number;

  @IsNumber()
  @IsOptional()
  fullfillmentAcceptance: number;

  @IsNumber()
  @IsOptional()
  marketplaceAcceptance: number;

  @IsString()
  @IsOptional()
  costCalculationType: string;

  @IsString()
  @IsOptional()
  downloadCalculationMethod: string;

  @IsString()
  @IsOptional()
  calculationType: string;

  @IsString()
  @IsOptional()
  transportType: string;

  @IsString()
  @IsOptional()
  deliveryMethod: string;
}
