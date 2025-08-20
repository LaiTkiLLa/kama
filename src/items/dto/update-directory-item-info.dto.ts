import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
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
