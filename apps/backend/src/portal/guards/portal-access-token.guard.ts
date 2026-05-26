import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PortalAccessTokenGuard extends AuthGuard('portal-jwt') {}
