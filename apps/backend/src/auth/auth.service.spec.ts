import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';
import { AuthService } from './auth.service';
import { OrganizationUserRole } from '../organizations/entities/organization-user.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';

type UserRecord = {
  id: string;
  email: string;
  name?: string;
  password_hash?: string;
};

type OrganizationRecord = {
  id: string;
  name: string;
  folio: string;
};

type MembershipRecord = {
  id: string;
  user_id?: string;
  organization_id: string;
  role: OrganizationUserRole;
  is_active?: boolean;
  organization?: OrganizationRecord;
};

type AuthSessionRecord = {
  id: string;
  user_id: string;
  organization_id: string;
  membership_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

type SaveResult = { affected: number };
type QueryRow = { folio: number };
type TransactionContext = {
  query: jest.Mock<Promise<QueryRow[]>, [string]>;
  getRepository: jest.Mock<unknown, [unknown]>;
};
type TransactionCallback = (manager: TransactionContext) => Promise<unknown>;
type UsersRepositoryMock = {
  findOneBy: jest.Mock<Promise<UserRecord | null>, [unknown]>;
  manager: {
    transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
};
type RolesRepositoryMock = {
  findOneBy: jest.Mock<Promise<{ id: string; name: string } | null>, [unknown]>;
  upsert: jest.Mock<Promise<unknown>, [unknown, unknown]>;
};
type OrganizationUsersRepositoryMock = {
  find: jest.Mock<Promise<MembershipRecord[]>, [unknown]>;
  findOne: jest.Mock<Promise<MembershipRecord | null>, [unknown]>;
};
type AuthSessionsRepositoryMock = {
  findOne: jest.Mock<Promise<AuthSessionRecord | null>, [unknown]>;
  save: jest.Mock<Promise<AuthSessionRecord>, [AuthSessionRecord]>;
  update: jest.Mock<Promise<SaveResult>, [unknown, unknown]>;
};

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

describe('AuthService security flows', () => {
  let service: AuthService;
  let usersRepository: UsersRepositoryMock;
  let rolesRepository: RolesRepositoryMock;
  let organizationUsersRepository: OrganizationUsersRepositoryMock;
  let authSessionsRepository: AuthSessionsRepositoryMock;
  let jwtService: { signAsync: jest.Mock<Promise<string>, [unknown, unknown]> };

  beforeEach(() => {
    usersRepository = {
      findOneBy: jest.fn<Promise<UserRecord | null>, [unknown]>(),
      manager: {
        transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
      },
    };
    rolesRepository = {
      findOneBy: jest.fn<
        Promise<{ id: string; name: string } | null>,
        [unknown]
      >(),
      upsert: jest.fn<Promise<unknown>, [unknown, unknown]>(),
    };
    organizationUsersRepository = {
      find: jest.fn<Promise<MembershipRecord[]>, [unknown]>(),
      findOne: jest.fn<Promise<MembershipRecord | null>, [unknown]>(),
    };
    authSessionsRepository = {
      findOne: jest.fn<Promise<AuthSessionRecord | null>, [unknown]>(),
      save: jest.fn<Promise<AuthSessionRecord>, [AuthSessionRecord]>(),
      update: jest.fn<Promise<SaveResult>, [unknown, unknown]>(),
    };
    jwtService = { signAsync: jest.fn<Promise<string>, [unknown, unknown]>() };

    service = new AuthService(
      usersRepository as never,
      rolesRepository as never,
      organizationUsersRepository as never,
      authSessionsRepository as never,
      jwtService as never,
      makeConfigService(),
    );
  });

  it('signup creates user, tenant membership, and returns tokens', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    rolesRepository.findOneBy.mockResolvedValue({
      id: 'role-owner',
      name: 'owner',
    });

    usersRepository.manager?.transaction.mockImplementation((cb) => {
      const userRepository = {
        create: jest.fn(() => ({ id: 'user-1', email: 'owner@vegyfresh.com' })),
        save: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@vegyfresh.com',
          name: 'Owner',
        }),
      };
      const orgRepository = {
        create: jest.fn(() => ({
          id: 'org-1',
          name: 'Org 1',
          folio: 'O00001',
        })),
        save: jest.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Org 1',
          folio: 'O00001',
        }),
      };
      const membershipRepository = {
        create: jest.fn(() => ({
          id: 'membership-1',
          organization_id: 'org-1',
          role: OrganizationUserRole.OWNER,
        })),
        save: jest.fn().mockResolvedValue({
          id: 'membership-1',
          organization_id: 'org-1',
          role: OrganizationUserRole.OWNER,
        }),
      };
      const authSessionRepository = {
        create: jest.fn((session: AuthSessionRecord) => session),
        save: jest
          .fn<Promise<AuthSessionRecord>, [AuthSessionRecord]>()
          .mockImplementation((session) => Promise.resolve(session)),
      };
      const queryMock = jest
        .fn<Promise<QueryRow[]>, [string]>()
        .mockResolvedValueOnce([{ folio: 1 }])
        .mockResolvedValueOnce([{ folio: 1 }]);
      const getRepositoryMock = jest
        .fn<unknown, [unknown]>()
        .mockReturnValueOnce(userRepository)
        .mockReturnValueOnce(rolesRepository)
        .mockReturnValueOnce(orgRepository)
        .mockReturnValueOnce(membershipRepository)
        .mockReturnValueOnce(authSessionRepository);

      return cb({
        query: queryMock,
        getRepository: getRepositoryMock,
      });
    });

    const generateTokensSpy = jest
      .spyOn(service as never, 'generateTokens' as never)
      .mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      } as never);

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
      expect.any(Object),
    );
  });

  it('signup rejects duplicate email', async () => {
    rolesRepository.findOneBy.mockResolvedValue({
      id: 'role-owner',
      name: 'owner',
    });
    usersRepository.manager.transaction.mockImplementation((cb) => {
      const userRepository = {
        create: jest.fn(() => ({ id: 'user-1', email: 'owner@vegyfresh.com' })),
        save: jest.fn().mockRejectedValue({
          code: '23505',
          constraint: 'users_email_key',
        }),
      };
      const queryMock = jest
        .fn<Promise<QueryRow[]>, [string]>()
        .mockResolvedValueOnce([{ folio: 1 }])
        .mockResolvedValueOnce([{ folio: 1 }]);
      const getRepositoryMock = jest
        .fn<unknown, [unknown]>()
        .mockReturnValueOnce(userRepository)
        .mockReturnValueOnce(rolesRepository);
      return cb({
        query: queryMock,
        getRepository: getRepositoryMock,
      });
    });

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

    jest.spyOn(service as never, 'generateTokens' as never).mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    } as never);

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
      .mockResolvedValue({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      } as never);

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

    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
    expect(authSessionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1' }),
    );
    const savedSession = authSessionsRepository.save.mock.calls[0]?.[0];
    expect(savedSession?.revoked_at).toBeInstanceOf(Date);
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

    await expect(
      service.refreshToken(user, 'refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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

    await expect(
      service.refreshToken(user, refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(organizationUsersRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'membership-1',
          user_id: 'user-1',
          organization_id: 'org-1',
          is_active: true,
        },
      }),
    );
  });

  it('refresh rejects session tenant mismatch', async () => {
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

    await expect(
      service.refreshToken(
        {
          sub: 'user-1',
          email: 'owner@vegyfresh.com',
          org_id: 'org-2',
          membership_id: 'membership-2',
          role: OrganizationUserRole.ADMIN,
          permissions: ['users:manage'],
          session_id: 'session-1',
        },
        refreshToken,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(organizationUsersRepository.findOne).not.toHaveBeenCalled();
  });

  it('me returns user profile with tenant-scoped membership context', async () => {
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      email: 'owner@vegyfresh.com',
      name: 'Owner',
    });
    organizationUsersRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      role: OrganizationUserRole.OWNER,
      is_active: true,
      organization: { id: 'org-1', name: 'Org 1', folio: 'O00001' },
    });

    const result = await service.me({
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      membership_id: 'membership-1',
      role: OrganizationUserRole.OWNER,
      permissions: ['*'],
      session_id: 'session-1',
    });

    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Owner',
        email: 'owner@vegyfresh.com',
      },
      organization: {
        id: 'org-1',
        name: 'Org 1',
        folio: 'O00001',
      },
      membership: {
        id: 'membership-1',
        role: OrganizationUserRole.OWNER,
      },
    });
    expect(organizationUsersRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'membership-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        is_active: true,
      },
      relations: { organization: true },
    });
  });

  it('me rejects when scoped tenant membership is missing', async () => {
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      email: 'owner@vegyfresh.com',
      name: 'Owner',
    });
    organizationUsersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.me({
        sub: 'user-1',
        email: 'owner@vegyfresh.com',
        org_id: 'org-1',
        membership_id: 'membership-1',
        role: OrganizationUserRole.OWNER,
        permissions: ['*'],
        session_id: 'session-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
      expect.objectContaining({
        id: 'session-1',
        user_id: 'user-1',
        revoked_at: IsNull(),
      }),
      expect.objectContaining({}),
    );
    const logoutUpdatePayload = authSessionsRepository.update.mock
      .calls[0]?.[1] as { revoked_at?: unknown } | undefined;
    expect(logoutUpdatePayload?.revoked_at).toBeInstanceOf(Date);
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
      expect.objectContaining({}),
    );
    const logoutAllUpdatePayload = authSessionsRepository.update.mock
      .calls[0]?.[1] as { revoked_at?: unknown } | undefined;
    expect(logoutAllUpdatePayload?.revoked_at).toBeInstanceOf(Date);
  });
});
