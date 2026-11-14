import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

describe('AccessTokenGuard', () => {
  const makeContext = () =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('allows requests when route is public', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    const guard = new AccessTokenGuard(reflector as unknown as Reflector);

    const allowed = guard.canActivate(makeContext());

    expect(allowed).toBe(true);
  });

  it('delegates to passport guard for non-public routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    const guard = new AccessTokenGuard(reflector as unknown as Reflector);
    const superPrototype = Object.getPrototypeOf(
      AccessTokenGuard.prototype,
    ) as { canActivate: (context: ExecutionContext) => boolean };
    const superSpy = jest
      .spyOn(superPrototype, 'canActivate')
      .mockReturnValue(true);

    const allowed = guard.canActivate(makeContext());

    expect(superSpy).toHaveBeenCalled();
    expect(allowed).toBe(true);
    superSpy.mockRestore();
  });
});
