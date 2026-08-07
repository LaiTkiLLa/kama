import { ArrayMinSize, IsArray, IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetDynamicOrdersDto {
  @IsNumberString()
  days: number;

  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB', 'Yandex', 'Ozon Second', 'Yandex Tamov'], {
    message: 'Недопустимое значение marketplace'
  })
  marketplace: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  suppliers?: string[];
}
