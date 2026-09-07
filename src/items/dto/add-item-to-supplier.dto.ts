import { IsNotEmpty, IsString } from 'class-validator';

export class AddItemToSupplierDto {
  @IsString()
  @IsNotEmpty()
  article: string;

  @IsString()
  @IsNotEmpty()
  supplier: string;
}
