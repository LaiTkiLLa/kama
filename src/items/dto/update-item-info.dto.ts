import { IsInt, IsPositive } from 'class-validator';

export class UpdateItemInfoDto {
  @IsInt()
  @IsPositive()
  statusId: number;

  @IsInt()
  @IsPositive()
  directionId: number;
}
