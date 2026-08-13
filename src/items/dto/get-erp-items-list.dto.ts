import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';

export class GetErpItemsListDto {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  withTestArticles: boolean;

  @IsOptional()
  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB', 'Yandex', 'Ozon Tamov', 'Yandex Tamov'], {
    message: 'Недопустимое значение marketplace'
  })
  marketplace: string = 'WB';
}
