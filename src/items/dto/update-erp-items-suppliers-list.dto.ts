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

export class UpdateErpItemSuppliersListDto {
  @IsNumber()
  itemSupplierId: number;

  @IsString()
  @IsOptional()
  boxNumber: string;

  @IsString()
  @IsOptional()
  multiplicity: string;

  @IsNumber()
  @IsOptional()
  supplierMinimumOrder: number;

  @IsNumber()
  @IsOptional()
  costInYuan: number;

  @IsNumber()
  @IsOptional()
  costInYuanWhite: number;

  @IsNumber()
  @IsOptional()
  payment: number;

  @IsNumber()
  @IsOptional()
  production: number;

  @IsNumber()
  @IsOptional()
  assembling: number;

  @IsString()
  @IsOptional()
  dimensionsMasterBox: string;

  @IsString()
  @IsOptional()
  dimensionsFact: string;

  @IsString()
  @IsOptional()
  ownImagesUrl: string;

  @IsString()
  @IsOptional()
  supplier: string;
}

export class UpdateArrayErpItemsSuppliersListDto {
  @ValidateNested({
    each: true
  })
  @Type(() => UpdateErpItemSuppliersListDto)
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  items: UpdateErpItemSuppliersListDto[];
}
