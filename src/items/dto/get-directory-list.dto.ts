import { IsString } from 'class-validator';

export class GetDirectoryListDto {
  @IsString()
  supplierTitle: string
}