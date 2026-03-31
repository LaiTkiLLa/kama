import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ArticleLowDaysStocksDto {
  @IsString()
  article: string;

  @IsNumber()
  daysStockCountry: number;

  @IsNumber()
  daysStockFullfillment: number;
}

export class CreateLowDaysStocksDto {
  @ValidateNested({
    message: 'itemsInfo должен передаваться массивом из объектов',
    each: true
  })
  @Type(() => ArticleLowDaysStocksDto)
  @IsArray({ message: 'items должен передаваться массивом объектов' })
  items: ArticleLowDaysStocksDto[];
}
