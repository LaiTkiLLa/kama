import { IsIn, IsNumberString, IsString } from 'class-validator';

export class GetDynamicOrdersDto {
  @IsNumberString()
  days: number;

  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB', 'Yandex', 'Ozon Second'], { message: 'Недопустимое значение marketplace' })
  marketplace: string;
}
