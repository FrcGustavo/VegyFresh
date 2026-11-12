import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class PortalOrdersQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsBooleanString()
  includeCanceled?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  pageSize?: string;
}
