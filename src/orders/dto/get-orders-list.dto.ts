import { IsIn, IsString } from 'class-validator';

export class GetOrdersListDto {
  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB', 'Yandex', 'Ozon Tamov', 'Yandex Tamov'], {
    message: 'Недопустимое значение marketplace'
  })
  marketplace: string;
}
