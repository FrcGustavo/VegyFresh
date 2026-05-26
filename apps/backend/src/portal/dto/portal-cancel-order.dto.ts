import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PortalCancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
