import { IsOptional, IsString } from 'class-validator';

export class GetDirectoryListDto {
  @IsString()
  @IsOptional()
  supplierTitle: string;
}
