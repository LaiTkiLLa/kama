import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class GetCurrentStocksDto {
  @IsString({ message: 'marketplace тип данных должен быть string' })
  @IsIn(['Озон', 'WB', 'Yandex', 'Ozon Tamov', 'Yandex Tamov'], {
    message: 'Недопустимое значение marketplace'
  })
  marketplace: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  suppliers?: string[];

  @IsString({ message: 'warehouseType тип данных должен быть string' })
  @IsIn(['FBS', 'FBO'], {
    message: 'Недопустимое значение warehouseType'
  })
  @IsOptional()
  warehouseType: 'FBS' | 'FBO';
}
