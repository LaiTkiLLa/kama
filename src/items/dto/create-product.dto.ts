import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class CreateProductWbDto {
  @IsNumber()
  subjectID: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  article: string;

  @ValidateNested()
  @Type(() => CreateProductWbDto)
  @IsNotEmpty()
  wb: CreateProductWbDto;
}
