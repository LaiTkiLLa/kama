import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetItemsStopListDto {
  @IsString()
  @IsOptional()
  @IsIn(['WB', 'Озон', 'Yandex', 'Ozon Tamov', 'Yandex Tamov'])
  marketplaceTitle: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  withActiveStatus: boolean;
}
