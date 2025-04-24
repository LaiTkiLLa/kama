import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetStocksByDateDto {
  @Transform(({ value }) => value.split(',').map(String))
  @IsString({ message: 'date тип данных должен быть string', each: true })
  date: string[];
}
