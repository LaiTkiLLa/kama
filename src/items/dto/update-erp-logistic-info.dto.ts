import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class ItemLogisticsInfoDto {
  @IsNumber()
  id: number;

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

export class UpdateErpLogisticInfoDto {
  @ValidateNested({
    each: true
  })
  @Type(() => ItemLogisticsInfoDto)
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  items: ItemLogisticsInfoDto[];
}
