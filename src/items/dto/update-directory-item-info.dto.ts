import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDirectoryItemInfoDto {
  @IsString()
  @IsOptional()
  ownCategory: string;

  @IsString()
  @IsOptional()
  supplier: string;

  @IsString()
  @IsOptional()
  article: string;

  @IsString()
  @IsOptional()
  classification: string;

  @IsString()
  @IsOptional()
  multiplicity: string;

  @IsString()
  @IsOptional()
  boxNumber: string;

  @IsString()
  @IsOptional()
  dimensionsFact: string;

  @IsString()
  @IsOptional()
  articleOld: string;

  @IsString()
  @IsOptional()
  volume: string;

  @IsNumber()
  @IsOptional()
  planTime: number;

  @IsNumber()
  @IsOptional()
  productionAndAssemblyTime: number;

  @IsNumber()
  @IsOptional()
  deliveryTime: number;

  @IsNumber()
  @IsOptional()
  shippingPeriod: number;

  @IsNumber()
  @IsOptional()
  stocksInDays: number;

  @IsNumber()
  @IsOptional()
  costInYuan: number;

  @IsNumber()
  @IsOptional()
  costInRub: number;

  @IsNumber()
  @IsOptional()
  replenishmentPeriod: number;

  @IsNumber()
  @IsOptional()
  remainingBalance: number;

  @IsNumber()
  @IsOptional()
  frequencyOfSendingCars: number;

  @IsNumber()
  @IsOptional()
  dailyGrowthPercentage: number;

  @IsString()
  @IsOptional()
  ownImagesUrl: string;
}

export class UpdateArrayDirectoryItemsInfoDto {
  @ValidateNested({
    each: true
  })
  @Type(() => UpdateDirectoryItemInfoDto)
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  items: UpdateDirectoryItemInfoDto[];
}
