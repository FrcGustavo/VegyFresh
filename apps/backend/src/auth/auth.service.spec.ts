import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';
import { AuthService } from './auth.service';
import { OrganizationUserRole } from '../organizations/entities/organization-user.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';

const makeConfigService = () => ({
  get: jest.fn((key: string) => {
    const values: Record<string, unknown> = {
      BCRYPT_SALT_ROUNDS: 10,
      JWT_ACCESS_SECRET: 'access-secret-key-with-32-characters!',
      JWT_REFRESH_SECRET: 'refresh-secret-key-with-32-characters!',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    };
    return values[key];
  }),
});

type MockRepository = Record<string, any> & {
  manager?: {
    transaction: jest.Mock;
  };
};

describe('AuthService security flows', () => {
  let service: AuthService;
  let usersRepository: MockRepository;
  let rolesRepository: MockRepository;
  let organizationsRepository: MockRepository;
  let organizationUsersRepository: MockRepository;
  let authSessionsRepository: MockRepository;
  let jwtService: { signAsync: jest.Mock };

  beforeEach(() => {
    usersRepository = {
      findOneBy: jest.fn(),
      manager: { transaction: jest.fn() },
    };
    rolesRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    organizationsRepository = {};
    organizationUsersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    authSessionsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    jwtService = { signAsync: jest.fn() };

    service = new AuthService(
      usersRepository as never,
      rolesRepository as never,
      organizationsRepository as never,
      organizationUsersRepository as never,
      authSessionsRepository as never,
      jwtService as never,
      makeConfigService() as never,
    );
  });

  it('signup creates user, tenant membership, and returns tokens', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    rolesRepository.findOneBy.mockResolvedValue({ id: 'role-owner', name: 'owner' });

    usersRepository.manager?.transaction.mockImplementation(async (cb: any) => {
      const userRepository = {
        create: jest.fn(() => ({ id: 'user-1', email: 'owner@vegyfresh.com' })),
        save: jest.fn(async () => ({
          id: 'user-1',
          email: 'owner@vegyfresh.com',
          name: 'Owner',
        })),
      };
      const orgRepository = {
        create: jest.fn(() => ({ id: 'org-1', name: 'Org 1', folio: 'O00001' })),
        save: jest.fn(async () => ({ id: 'org-1', name: 'Org 1', folio: 'O00001' })),
      };
      const membershipRepository = {
        create: jest.fn(() => ({ id: 'membership-1', role: OrganizationUserRole.OWNER })),
        save: jest.fn(async () => ({
          id: 'membership-1',
          role: OrganizationUserRole.OWNER,
        })),
      };

      return cb({
        query: jest
          .fn()
          .mockResolvedValueOnce([{ folio: 1 }])
          .mockResolvedValueOnce([{ folio: 1 }]),
        getRepository: jest
          .fn()
          .mockReturnValueOnce(userRepository)
          .mockReturnValueOnce(orgRepository)
          .mockReturnValueOnce(membershipRepository),
      });
    });

    const generateTokensSpy = jest
      .spyOn(service as never, 'generateTokens' as never)
      .mockResolvedValue({ access_token: 'access-token', refresh_token: 'refresh-token' } as never);

    const result = await service.signup({
      name: 'Owner',
      email: 'owner@vegyfresh.com',
      password: 'super-secure-password',
      organization_name: 'Org 1',
      organization_legal_name: null,
      organization_phone_number: null,
      organization_address: null,
    });

    expect(result.user.email).toBe('owner@vegyfresh.com');
    expect(result.organization.id).toBe('org-1');
    expect(result.membership.role).toBe(OrganizationUserRole.OWNER);
    expect(result.access_token).toBe('access-token');
    expect(generateTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.OWNER,
      }),
    );
  });

  it('signup rejects duplicate email', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.signup({
        name: 'Owner',
        email: 'owner@vegyfresh.com',
        password: 'super-secure-password',
        organization_name: 'Org 1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login authenticates and respects requested organization scope', async () => {
    const hashedPassword = await bcrypt.hash('super-secure-password', 10);
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      email: 'owner@vegyfresh.com',
      password_hash: hashedPassword,
    });
    organizationUsersRepository.find.mockResolvedValue([
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: OrganizationUserRole.OWNER,
        organization: { id: 'org-1', name: 'Org 1', folio: 'O00001' },
      },
      {
        id: 'membership-2',
        organization_id: 'org-2',
        role: OrganizationUserRole.ADMIN,
        organization: { id: 'org-2', name: 'Org 2', folio: 'O00002' },
      },
    ]);

    jest
      .spyOn(service as never, 'generateTokens' as never)
      .mockResolvedValue({ access_token: 'access-token', refresh_token: 'refresh-token' } as never);

    const result = await service.login({
      email: 'owner@vegyfresh.com',
      password: 'super-secure-password',
      organization_id: 'org-2',
    });

    expect(result.organization.id).toBe('org-2');
    expect(result.membership.id).toBe('membership-2');
  });

  it('login rejects organization outside user memberships', async () => {
    const hashedPassword = await bcrypt.hash('super-secure-password', 10);
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      email: 'owner@vegyfresh.com',
      password_hash: hashedPassword,
    });
    organizationUsersRepository.find.mockResolvedValue([
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: OrganizationUserRole.OWNER,
        organization: { id: 'org-1', name: 'Org 1', folio: 'O00001' },
      },
    ]);

    await expect(
      service.login({
        email: 'owner@vegyfresh.com',
        password: 'super-secure-password',
        organization_id: 'org-2',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rotates token pair and revokes old session', async () => {
    const refreshToken = 'refresh-token';
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    authSessionsRepository.findOne.mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      membership_id: 'membership-1',
      refresh_token_hash: refreshHash,
      expires_at: new Date(Date.now() + 10_000),
      revoked_at: null,
    });
    organizationUsersRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      role: OrganizationUserRole.ADMIN,
      is_active: true,
    });

    const generateTokensSpy = jest
      .spyOn(service as never, 'generateTokens' as never)
      .mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh' } as never);

    const user: AuthenticatedUser = {
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.ADMIN,
      permissions: ['users:manage'],
      session_id: 'session-1',
    };

    const result = await service.refreshToken(user, refreshToken);

    expect(result).toEqual({ access_token: 'new-access', refresh_token: 'new-refresh' });
    expect(authSessionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1', revoked_at: expect.any(Date) }),
    );
    expect(generateTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.ADMIN,
      }),
    );
  });

  it('refresh rejects mismatched refresh token', async () => {
    const refreshHash = await bcrypt.hash('different-refresh-token', 10);

    authSessionsRepository.findOne.mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      membership_id: 'membership-1',
      refresh_token_hash: refreshHash,
      expires_at: new Date(Date.now() + 10_000),
      revoked_at: null,
    });

    const user: AuthenticatedUser = {
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.ADMIN,
      permissions: ['users:manage'],
      session_id: 'session-1',
    };

    await expect(service.refreshToken(user, 'refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh rejects inactive tenant membership', async () => {
    const refreshToken = 'refresh-token';
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    authSessionsRepository.findOne.mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      membership_id: 'membership-1',
      refresh_token_hash: refreshHash,
      expires_at: new Date(Date.now() + 10_000),
      revoked_at: null,
    });
    organizationUsersRepository.findOne.mockResolvedValue(null);

    const user: AuthenticatedUser = {
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.ADMIN,
      permissions: ['users:manage'],
      session_id: 'session-1',
    };

    await expect(service.refreshToken(user, refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(organizationUsersRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'membership-1',
          user_id: 'user-1',
          organization_id: 'org-1',
          is_active: true,
        }),
      }),
    );
  });

  it('logout revokes only current session', async () => {
    authSessionsRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.logout({
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.OWNER,
      permissions: ['*'],
      session_id: 'session-1',
    });

    expect(result).toEqual({ revoked: true });
    expect(authSessionsRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1', user_id: 'user-1', revoked_at: IsNull() }),
      expect.objectContaining({ revoked_at: expect.any(Date) }),
    );
  });

  it('logout-all revokes all sessions in current tenant only', async () => {
    authSessionsRepository.update.mockResolvedValue({ affected: 2 });

    const result = await service.logoutAll({
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.OWNER,
      permissions: ['*'],
      session_id: 'session-1',
    });

    expect(result).toEqual({ revoked: true });
    expect(authSessionsRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        organization_id: 'org-1',
        revoked_at: IsNull(),
      }),
      expect.objectContaining({ revoked_at: expect.any(Date) }),
    );
  });
});
