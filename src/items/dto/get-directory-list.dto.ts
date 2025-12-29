import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetDirectoryListDto {
  @IsString()
  @IsOptional()
  supplierTitle: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  withTestArticles: boolean;
}
