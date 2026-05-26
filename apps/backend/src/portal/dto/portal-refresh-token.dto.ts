import { IsJWT } from 'class-validator';

export class PortalRefreshTokenDto {
  @IsJWT()
  refresh_token!: string;
}
