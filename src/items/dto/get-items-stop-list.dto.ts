import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetItemsStopListDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  searchString: string;
}
