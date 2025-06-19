import { IsEnum } from 'class-validator';
import { StatusesTypes } from '../enum/statuses.enum';

export class GetStatusesListDto {
  @IsEnum(StatusesTypes, { message: 'type некорректное значение' })
  type: StatusesTypes;
}
