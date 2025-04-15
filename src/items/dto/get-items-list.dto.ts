import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetItemsListDto {
  @IsOptional()
  @Transform(({ value }) => value.split(',').map((value) => Number(value)))
  @IsArray({ message: 'Тип данных itemsIds должен быть массив чисел' })
  @ArrayMinSize(1, { message: 'Длина itemsIds минимум 1 значение' })
  @ArrayMaxSize(20, { message: 'Длина itemsIds максимум 20 значений' })
  @IsNumber(
    {},
    { message: 'itemsIds тип данных должен быть number', each: true },
  )
  @IsInt({ message: 'itemsIds должен быть целым числом', each: true })
  @IsPositive({
    message: 'itemsIds должен быть положительным числом',
    each: true,
  })
  itemsIds: number[];
}
