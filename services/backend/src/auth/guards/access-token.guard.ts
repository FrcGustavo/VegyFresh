import {
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ExternalIdentityNotLinkedException } from '../../identity/identity.service';

export const UNLINKED_IDENTITY_NOT_FOUND = 'unlinkedIdentityNotFound';

@Injectable()
export class AccessTokenGuard extends AuthGuard('oidc-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    error: Error | null,
    user: TUser | false,
    info: Error | undefined,
    context: ExecutionContext,
  ): TUser {
    if (
      this.reflector.get<boolean>(
        UNLINKED_IDENTITY_NOT_FOUND,
        context.getHandler(),
      ) &&
      (error instanceof ExternalIdentityNotLinkedException ||
        info instanceof ExternalIdentityNotLinkedException)
    ) {
      throw new NotFoundException('External identity is not linked');
    }
    if (
      error instanceof ExternalIdentityNotLinkedException ||
      info instanceof ExternalIdentityNotLinkedException
    )
      throw new UnauthorizedException();
    return super.handleRequest(error, user, info, context);
  }
}
