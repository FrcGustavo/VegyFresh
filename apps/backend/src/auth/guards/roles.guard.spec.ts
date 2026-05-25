import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { OrganizationUserRole } from '../../organizations/entities/organization-user.entity';
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

  it('allows routes without role/permission decorators', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const allowed = await guard.canActivate(makeContext({ user: undefined }));

    expect(allowed).toBe(true);
  });

  it('blocks requests missing tenant-scoped user context', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(undefined);

    await expect(guard.canActivate(makeContext({ user: { sub: 'user-1' } }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('uses user permissions from request context', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['orders:read']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.MEMBER,
        permissions: ['orders:read'],
      },
    };

    const allowed = await guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        role: OrganizationUserRole.MEMBER,
        permissions: ['orders:read'],
      }),
    );
  });

  it('falls back to permissions derived from role when permissions are missing', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['orders:read']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.MEMBER,
        permissions: [],
      },
    };

    const allowed = await guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        role: OrganizationUserRole.MEMBER,
        permissions: ['catalog:read', 'orders:read'],
      }),
    );
  });

  it('rejects role mismatch and insufficient permissions', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(['users:manage']);

    await expect(
      guard.canActivate(
        makeContext({
          user: {
            sub: 'user-1',
            org_id: 'org-1',
            membership_id: 'membership-1',
            role: OrganizationUserRole.ADMIN,
            permissions: ['users:manage'],
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows wildcard owner permissions for protected operations', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(['users:manage']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.OWNER,
        permissions: ['*'],
      },
    };

    const allowed = await guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        role: OrganizationUserRole.OWNER,
        permissions: ['*'],
      }),
    );
  });
});
