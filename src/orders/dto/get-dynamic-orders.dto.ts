import { IsNumberString } from 'class-validator';

export class GetDynamicOrdersDto {
  @IsNumberString()
  days: number
}