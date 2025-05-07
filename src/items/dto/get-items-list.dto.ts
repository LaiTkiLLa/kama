import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetItemsListDto {
  @IsOptional()
  @Transform(({ value }) => value.split(',').map(value => Number(value)))
  @IsArray({ message: 'Тип данных itemsId должен быть массив чисел' })
  @ArrayMinSize(1, { message: 'Длина itemsId минимум 1 значение' })
  @ArrayMaxSize(20, { message: 'Длина itemsId максимум 20 значений' })
  @IsNumber({}, { message: 'itemsId тип данных должен быть number', each: true })
  @IsInt({ message: 'itemsId должен быть целым числом', each: true })
  @IsPositive({
    message: 'itemsId должен быть положительным числом',
    each: true
  })
  itemsId: number[];

  @IsIn(['Ozon', 'WB'], { message: 'Некорректное значение marketplaceTitle' })
  marketplaceTitle: 'Ozon' | 'WB';
}
