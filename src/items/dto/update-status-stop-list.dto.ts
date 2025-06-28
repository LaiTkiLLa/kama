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

  @Type(() => StatusesInfo)
  statuses: { marketplace: string; status: string }[];
}

export class UpdateStopListItems {
  @ValidateNested({
    message: 'itemsInfo должен передаваться массивом из объектов',
    each: true
  })
  @Type(() => UpdateStopListDto)
  @IsArray({ message: 'itemsInfo должен передаваться массивом объектов' })
  items: UpdateStopListDto[];
}
