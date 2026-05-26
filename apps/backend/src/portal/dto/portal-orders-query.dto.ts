import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class PortalOrdersQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBooleanString()
  includeCanceled?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
