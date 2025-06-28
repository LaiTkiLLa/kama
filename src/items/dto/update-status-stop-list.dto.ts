import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StatusesInfo {
  @IsString()
  marketplace: string;

  @IsString()
  status: string;
}

export class UpdateStopListDto {
  @IsString()
  itemArticle: string;

  @ValidateNested({
    message: 'statuses должен передаваться массивом из объектов',
    each: true
  })
  @Type(() => StatusesInfo)
  @IsArray({ message: 'statuses должен передаваться массивом объектов' })
  statuses: { marketplace: string; status: string }[];
}

export class UpdateStopListItems {
  @ValidateNested({
    message: 'itemsInfo должен передаваться массивом из объектов',
    each: true
  })
  @Type(() => UpdateStopListDto)
  @IsArray({ message: 'items должен передаваться массивом объектов' })
  items: UpdateStopListDto[];
}
