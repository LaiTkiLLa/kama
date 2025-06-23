import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetItemsStopListDto {
  // @Type(() => Number)
  // @IsInt({ message: 'limit число должно быть целым' })
  // @Min(1, { message: 'Не менее 1 в одном ответе' })
  // @Max(50, { message: 'Не более 50 в одном ответе' })
  // limit: number;
  //
  // @Type(() => Number)
  // @Min(0, { message: 'offset минимальное значение не меньше 0' })
  // @IsInt({ message: 'offset число должно быть целым' })
  // offset: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  searchString: string;
}
