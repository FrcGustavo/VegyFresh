import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { OrganizationUserRole } from '../../organizations/entities/organization-user.entity';
import { RolesGuard } from './roles.guard';

describe('RolesGuard permission and tenant security', () => {
  let reflector: Pick<Reflector, 'getAllAndOverride'>;
  let organizationUsersRepository: { findOneBy: jest.Mock };
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
    organizationUsersRepository = {
      findOneBy: jest.fn(),
    };

    guard = new RolesGuard(
      reflector as Reflector,
      organizationUsersRepository as never,
    );
  });

  it('allows routes without role/permission decorators', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const allowed = await guard.canActivate(makeContext({ user: undefined }));

    expect(allowed).toBe(true);
    expect(organizationUsersRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('blocks requests missing tenant-scoped user context', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(undefined);

    await expect(guard.canActivate(makeContext({ user: { sub: 'user-1' } }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('enforces tenant membership lookup using token organization scope', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['orders:read']);

    const request = {
      user: {
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
      },
    };

    organizationUsersRepository.findOneBy.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.MEMBER,
      user_id: 'user-1',
      organization_id: 'org-1',
      is_active: true,
    });

    const allowed = await guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(organizationUsersRepository.findOneBy).toHaveBeenCalledWith({
      id: 'membership-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      is_active: true,
    });
    expect(request.user).toEqual(
      expect.objectContaining({
        role: OrganizationUserRole.MEMBER,
        permissions: ['catalog:read', 'orders:read'],
      }),
    );
  });

  it('rejects requests when membership is missing in scoped tenant', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['orders:read']);

    organizationUsersRepository.findOneBy.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        makeContext({
          user: {
            sub: 'user-1',
            org_id: 'other-org',
            membership_id: 'membership-1',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects role mismatch and insufficient permissions', async () => {
    (reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['owner'])
      .mockReturnValueOnce(['users:manage']);

    organizationUsersRepository.findOneBy.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.ADMIN,
      user_id: 'user-1',
      organization_id: 'org-1',
      is_active: true,
    });

    await expect(
      guard.canActivate(
        makeContext({
          user: {
            sub: 'user-1',
            org_id: 'org-1',
            membership_id: 'membership-1',
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
      },
    };

    organizationUsersRepository.findOneBy.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.OWNER,
      user_id: 'user-1',
      organization_id: 'org-1',
      is_active: true,
    });

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
