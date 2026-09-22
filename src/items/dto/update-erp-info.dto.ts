import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested
} from 'class-validator';

export class ItemInfoDto {
  @IsNumber()
  mpItemId: number;

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsOptional()
  ownCategory: string;

  @IsString()
  @IsOptional()
  descriptionRussian: string;

  @IsString()
  @IsOptional()
  descriptionEnglish: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsBoolean()
  @IsOptional()
  certificationRequired: boolean;

  @IsString()
  @IsOptional()
  certificationLink: string;

  @IsString()
  @IsOptional()
  material: string;

  @IsString()
  @IsOptional()
  packagingType: string;
}

export class UpdateErpInfoDto {
  @ValidateNested({
    each: true
  })
  @Type(() => ItemInfoDto)
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  items: ItemInfoDto[];
}
