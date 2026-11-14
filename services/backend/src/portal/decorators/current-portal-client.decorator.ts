import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedPortalClient } from '../types/authenticated-portal-client.type';

export const CurrentPortalClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPortalClient => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedPortalClient }>();
    return request.user;
  },
);
