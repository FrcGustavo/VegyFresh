import { ForbiddenException } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();

    if (!request.user.org_id) {
      throw new ForbiddenException(
        'User context is missing organization scope',
      );
    }

    return request.user.org_id;
  },
);
