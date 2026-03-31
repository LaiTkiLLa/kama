import { IsString } from 'class-validator';

export class GetChangePriceHistoryDto {
  @IsString()
  date: Date;
}