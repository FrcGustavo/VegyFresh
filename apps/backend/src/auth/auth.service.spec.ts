import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';

type UserRecord = {
  id: string;
  email: string;
  name?: string;
  password_hash?: string;
  organization_id?: string;
  role?: {
    id: string;
    name: string;
    permissions: Array<Record<string, unknown>>;
  };
  organization?: {
    id: string;
    name: string;
    folio: string;
  };
};

type RoleRecord = {
  id: string;
  name: string;
  permissions: Array<Record<string, unknown>>;
};

type AuthSessionRecord = {
  id: string;
  user_id: string;
  organization_id: string;
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
  findOne: jest.Mock<Promise<UserRecord | null>, [unknown]>;
  manager: {
    transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
};
type FoliosServiceMock = {
  nextFolio: jest.Mock<Promise<string>, [string, string, unknown?]>;
};
type RolesServiceMock = {
  ensureOwnerRole: jest.Mock<Promise<RoleRecord>, []>;
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
  let foliosService: FoliosServiceMock;
  let rolesService: RolesServiceMock;
  let authSessionsRepository: AuthSessionsRepositoryMock;
  let jwtService: { signAsync: jest.Mock<Promise<string>, [unknown, unknown]> };

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn<Promise<UserRecord | null>, [unknown]>(),
      manager: {
        transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
      },
    };
    foliosService = {
      nextFolio: jest.fn<Promise<string>, [string, string, unknown?]>(),
    };
    rolesService = {
      ensureOwnerRole: jest.fn<Promise<RoleRecord>, []>(),
    };
    authSessionsRepository = {
      findOne: jest.fn<Promise<AuthSessionRecord | null>, [unknown]>(),
      save: jest.fn<Promise<AuthSessionRecord>, [AuthSessionRecord]>(),
      update: jest.fn<Promise<SaveResult>, [unknown, unknown]>(),
    };
    jwtService = { signAsync: jest.fn<Promise<string>, [unknown, unknown]>() };

    service = new AuthService(
      usersRepository as never,
      rolesService as never,
      authSessionsRepository as never,
      foliosService as never,
      jwtService as never,
      makeConfigService(),
    );
  });

  it('signup creates a standalone user and returns role context', async () => {
    rolesService.ensureOwnerRole.mockResolvedValue({
      id: 'role-owner',
      name: 'owner',
      permissions: [{ action: '*', resource: '*' }],
    });
    foliosService.nextFolio.mockResolvedValue('U00001');

    usersRepository.manager.transaction.mockImplementation((cb) => {
      const userRepository = {
        create: jest.fn(() => ({
          id: 'user-1',
          email: 'owner@vegyfresh.com',
          organization_id: null,
        })),
        save: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@vegyfresh.com',
          name: 'Owner',
          organization_id: null,
        }),
      };
      const queryMock = jest.fn<Promise<QueryRow[]>, [string]>();
      const getRepositoryMock = jest
        .fn<unknown, [unknown]>()
        .mockReturnValueOnce(userRepository);

      return cb({
        query: queryMock,
        getRepository: getRepositoryMock,
      });
    });

    const result = await service.signup({
      name: 'Owner',
      email: 'owner@vegyfresh.com',
      password: 'super-secure-password',
    });

    expect(result.user.email).toBe('owner@vegyfresh.com');
    expect(result.role.name).toBe('owner');
    expect(rolesService.ensureOwnerRole).toHaveBeenCalledTimes(1);
    expect(foliosService.nextFolio).toHaveBeenCalledWith(
      'users',
      'global',
      expect.any(Object),
    );
  });

  it('signup rejects duplicate email', async () => {
    rolesService.ensureOwnerRole.mockResolvedValue({
      id: 'role-owner',
      name: 'owner',
      permissions: [{ action: '*', resource: '*' }],
    });
    foliosService.nextFolio.mockResolvedValue('U00001');
    usersRepository.manager.transaction.mockImplementation((cb) => {
      const userRepository = {
        create: jest.fn(() => ({ id: 'user-1', email: 'owner@vegyfresh.com' })),
        save: jest.fn().mockRejectedValue({
          code: '23505',
          constraint: 'users_email_key',
        }),
      };
      const queryMock = jest.fn<Promise<QueryRow[]>, [string]>();
      const getRepositoryMock = jest
        .fn<unknown, [unknown]>()
        .mockReturnValueOnce(userRepository);
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
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login authenticates without membership context', async () => {
    const hashedPassword = await bcrypt.hash('super-secure-password', 10);
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      email: 'owner@vegyfresh.com',
      password_hash: hashedPassword,
      organization_id: 'org-1',
      organization: { id: 'org-1', name: 'Org 1', folio: 'O00001' },
      role: {
        id: 'role-admin',
        name: 'admin',
        permissions: [{ action: 'manage', resource: 'users' }],
      },
    });

    jest.spyOn(service as never, 'generateTokens' as never).mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    } as never);

    const result = await service.login({
      email: 'owner@vegyfresh.com',
      password: 'super-secure-password',
    });

    expect(result.organization.id).toBe('org-1');
    expect(result.role.name).toBe('admin');
    expect((result as Record<string, unknown>).membership).toBeUndefined();
  });

  it('refresh rotates token pair without membership checks', async () => {
    const refreshToken = 'refresh-token';
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    authSessionsRepository.findOne.mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      refresh_token_hash: refreshHash,
      expires_at: new Date(Date.now() + 10_000),
      revoked_at: null,
    });
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
      role: {
        id: 'role-admin',
        name: 'admin',
        permissions: [{ action: 'manage', resource: 'users' }],
      },
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
      role: 'admin',
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
    expect(generateTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        org_id: 'org-1',
        role: 'admin',
      }),
    );
  });

  it('refresh rejects mismatched refresh token', async () => {
    const refreshHash = await bcrypt.hash('different-refresh-token', 10);

    authSessionsRepository.findOne.mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      refresh_token_hash: refreshHash,
      expires_at: new Date(Date.now() + 10_000),
      revoked_at: null,
    });

    const user: AuthenticatedUser = {
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      role: 'admin',
      permissions: ['users:manage'],
      session_id: 'session-1',
    };

    await expect(
      service.refreshToken(user, 'refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout revokes only current session', async () => {
    authSessionsRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.logout({
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      role: 'owner',
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
  });

  it('logout-all revokes all sessions in current tenant only', async () => {
    authSessionsRepository.update.mockResolvedValue({ affected: 2 });

    const result = await service.logoutAll({
      sub: 'user-1',
      email: 'owner@vegyfresh.com',
      org_id: 'org-1',
      role: 'owner',
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
  });
});
