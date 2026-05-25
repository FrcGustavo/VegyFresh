import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard permission and tenant security', () => {
  let reflector: Pick<Reflector, 'getAllAndOverride'>;
  let guard: RolesGuard;

  const makeContext = (request: Record<string, unknown>) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as Reflector);
  });

  it('allows routes without role/permission decorators', () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const allowed = guard.canActivate(makeContext({ user: undefined }));

    expect(allowed).toBe(true);
  });

  it('blocks requests missing tenant-scoped user context', () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(undefined);

    expect(() =>
      guard.canActivate(makeContext({ user: { sub: 'user-1' } })),
    ).toThrow(ForbiddenException);
  });

  it('uses user role and permissions from request context', () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['orders:read']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        role: 'member',
        permissions: ['orders:read'],
      },
    };

    const allowed = guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        role: 'member',
        permissions: ['orders:read'],
      }),
    );
  });

  it('rejects role mismatch and insufficient permissions', () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(['users:manage']);

    expect(() =>
      guard.canActivate(
        makeContext({
          user: {
            sub: 'user-1',
            org_id: 'org-1',
            role: 'admin',
            permissions: ['users:manage'],
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows wildcard owner permissions for protected operations', () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(['users:manage']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        role: 'owner',
        permissions: ['*'],
      },
    };

    const allowed = guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        role: 'owner',
        permissions: ['*'],
      }),
    );
  });
});
