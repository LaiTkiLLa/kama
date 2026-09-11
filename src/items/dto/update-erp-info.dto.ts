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

export class ItemInfoDto {
  @IsNumber()
  mpItemId: number;

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsOptional()
  ownCategory: string;
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
