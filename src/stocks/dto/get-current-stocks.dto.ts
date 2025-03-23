import { IsIn, IsString } from 'class-validator';

export class GetCurrentStocksDto {
  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB'], { message: 'Недопустимое значение marketplace' })
  marketplace: string;
}
