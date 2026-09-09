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
  id: number;

  @IsString()
  @IsOptional()
  category: string;
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
