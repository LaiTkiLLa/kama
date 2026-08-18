import { IsOptional, IsString } from 'class-validator';

export class BankDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  accBik: string;

  @IsString()
  @IsOptional()
  accKorschet: string;

  @IsString()
  @IsOptional()
  address: string;

  @IsString()
  @IsOptional()
  swift: string;
}
