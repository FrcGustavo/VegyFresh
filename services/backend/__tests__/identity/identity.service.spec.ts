import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Client } from 'src/clients/entities/client.entity';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { ExternalIdentity } from 'src/identity/entities/external-identity.entity';
import { IdentityService } from 'src/identity/identity.service';

describe('IdentityService', () => {
  const findExternalIdentity = jest.fn();
  const findExternalIdentityInTransaction = jest.fn();
  const createExternalIdentity = jest.fn(
    (value: Partial<ExternalIdentity>) => value as ExternalIdentity,
  );
  const saveExternalIdentity = jest.fn((value: ExternalIdentity) =>
    Promise.resolve(value),
  );
  const findUser = jest.fn();
  const findClient = jest.fn();
  const findUserByEmail = jest.fn();
  const createUser = jest.fn(
    (value: Partial<User>) => ({ id: 'new-user-id', ...value }) as User,
  );
  const saveUser = jest.fn((value: User) => Promise.resolve(value));
  const findOwnerRole = jest.fn();
  const transactionQuery = jest.fn();
  const externalIdentities = {
    findOne: findExternalIdentity,
  } as unknown as Repository<ExternalIdentity>;
  const users = {
    findOne: findUser,
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getOne: findUserByEmail,
    })),
  } as unknown as Repository<User>;
  const clients = {
    findOne: findClient,
  } as unknown as Repository<Client>;
  const transactionRepositories = new Map<unknown, unknown>([
    [
      ExternalIdentity,
      {
        findOneBy: findExternalIdentityInTransaction,
        create: createExternalIdentity,
        save: saveExternalIdentity,
      },
    ],
    [
      User,
      {
        findOne: findUser,
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          getOne: findUserByEmail,
        })),
        create: createUser,
        save: saveUser,
      },
    ],
    [Role, { findOneBy: findOwnerRole }],
  ]);
  const manager = {
    query: transactionQuery,
    getRepository: jest.fn((entity: unknown) =>
      transactionRepositories.get(entity),
    ),
  };
  const transaction = jest.fn(
    (operation: (m: EntityManager) => Promise<unknown>) =>
      operation(manager as unknown as EntityManager),
  );
  const dataSource = { transaction } as unknown as DataSource;
  let service: IdentityService;

  beforeEach(() => {
    jest.clearAllMocks();
    findExternalIdentity.mockResolvedValue(null);
    findExternalIdentityInTransaction.mockResolvedValue(null);
    findUser.mockResolvedValue(null);
    findClient.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue(null);
    findOwnerRole.mockResolvedValue(null);
    transactionRepositories.set(ExternalIdentity, {
      findOneBy: findExternalIdentityInTransaction,
      create: createExternalIdentity,
      save: saveExternalIdentity,
    });
    transactionRepositories.set(User, {
      findOne: findUser,
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: findUserByEmail,
      })),
      create: createUser,
      save: saveUser,
    });
    transactionRepositories.set(Role, { findOneBy: findOwnerRole });
    findExternalIdentityInTransaction.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue(null);
    createUser.mockImplementation(
      (value) => ({ id: 'new-user-id', ...value }) as User,
    );
    saveUser.mockImplementation((value) => Promise.resolve(value));
    createExternalIdentity.mockImplementation(
      (value) => value as ExternalIdentity,
    );
    saveExternalIdentity.mockImplementation((value) => Promise.resolve(value));
    service = new IdentityService(
      dataSource,
      externalIdentities,
      users,
      clients,
    );
  });

  it('maps admin subject to a local user and loads authorization from the database', async () => {
    findExternalIdentity.mockResolvedValue({
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-subject-1',
      identity_type: 'user',
      user_id: 'local-user-id',
      client_id: null,
    });
    findUser.mockResolvedValue({
      id: 'local-user-id',
      name: 'Local User',
      email: 'database@example.com',
      organization_id: 'local-org-id',
      organization: { id: 'local-org-id' },
      role: {
        name: 'operator',
        permissions: [{ resource: 'orders', action: 'read' }],
      },
    });

    const user = await service.resolveUser(
      'https://id.example/realms/vegyfresh',
      'kc-subject-1',
    );

    expect(findExternalIdentity).toHaveBeenCalledWith({
      where: {
        issuer: 'https://id.example/realms/vegyfresh',
        subject: 'kc-subject-1',
        identity_type: 'user',
      },
    });
    expect(findUser).toHaveBeenCalledWith({
      where: { id: 'local-user-id' },
      relations: { role: true, organization: true },
    });
    expect(user).toEqual({
      sub: 'local-user-id',
      email: 'database@example.com',
      org_id: 'local-org-id',
      role: 'operator',
      permissions: ['orders:read'],
    });
  });

  it('keeps the strict admin resolver from provisioning unknown subjects', async () => {
    findExternalIdentity.mockResolvedValue(null);

    await expect(
      service.resolveUser(
        'https://id.example/realms/vegyfresh',
        'unmapped-admin-subject',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(transaction).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates an org-less owner and subject mapping atomically from the admin profile claims', async () => {
    const ownerRole = {
      id: 'owner-role-id',
      name: 'owner',
      permissions: [
        { action: '*', resource: '*' },
        { action: 'manage', resource: 'organization' },
      ],
    };
    findExternalIdentity.mockResolvedValue(null);
    findOwnerRole.mockResolvedValue(ownerRole);

    const user = await service.resolveAdminUser(
      'https://id.example/realms/vegyfresh',
      'kc-new-admin',
      {
        email: '  New.Owner@Example.COM ',
        name: ' New Owner ',
        preferred_username: 'new-owner',
      },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionQuery).toHaveBeenCalledTimes(2);
    expect(createUser).toHaveBeenCalledWith({
      name: 'New Owner',
      folio: 'U0001',
      email: 'new.owner@example.com',
      role_id: ownerRole.id,
      role: ownerRole,
      organization_id: null,
      organization: null,
      avatar_url: null,
    });
    expect(createExternalIdentity).toHaveBeenCalledWith({
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-new-admin',
      identity_type: 'user',
      user_id: 'new-user-id',
      client_id: null,
    });
    expect(saveUser).toHaveBeenCalledTimes(1);
    expect(saveExternalIdentity).toHaveBeenCalledTimes(1);
    expect(user).toEqual({
      sub: 'new-user-id',
      email: 'new.owner@example.com',
      org_id: '',
      role: 'owner',
      permissions: ['*', 'organization:manage'],
    });
  });

  it('returns an existing subject link without changing its profile from newer claims', async () => {
    const linkedIdentity = {
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-subject-1',
      identity_type: 'user',
      user_id: 'local-user-id',
      client_id: null,
    };
    const linkedUser = {
      id: 'local-user-id',
      email: 'original@example.com',
      organization: null,
      organization_id: null,
      role: { name: 'owner', permissions: [{ resource: '*', action: '*' }] },
    };
    findExternalIdentity.mockResolvedValue(linkedIdentity);
    findUser.mockResolvedValue(linkedUser);

    const resolved = await service.resolveAdminUser(
      linkedIdentity.issuer,
      linkedIdentity.subject,
      { email: 'changed@example.com', name: 'Changed Name' },
    );

    expect(resolved.email).toBe('original@example.com');
    expect(transaction).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(saveExternalIdentity).not.toHaveBeenCalled();
  });

  it('rejects an existing unlinked email without associating the new subject', async () => {
    findExternalIdentity.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue({ id: 'existing-user-id' });

    await expect(
      service.resolveAdminUser(
        'https://id.example/realms/vegyfresh',
        'kc-unlinked-admin',
        { email: ' EXISTING@example.com ', name: 'Someone Else' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'USER_NOT_LINKED',
        message:
          'An existing local profile for this email must be linked by an administrator',
      },
    });

    expect(createUser).not.toHaveBeenCalled();
    expect(saveUser).not.toHaveBeenCalled();
    expect(saveExternalIdentity).not.toHaveBeenCalled();
  });

  it.each([
    { email: undefined, name: 'Owner' },
    { email: 'not-an-email', name: 'Owner' },
    { email: 'owner@example.com', name: 'x'.repeat(256) },
  ])(
    'rejects an incomplete admin profile before writing records',
    async (claims) => {
      findExternalIdentity.mockResolvedValue(null);

      await expect(
        service.resolveAdminUser(
          'https://id.example/realms/vegyfresh',
          'kc-incomplete-admin',
          claims,
        ),
      ).rejects.toMatchObject({
        response: {
          code: 'USER_PROFILE_INCOMPLETE',
          message: 'User profile is incomplete',
        },
      });

      expect(findUserByEmail).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
      expect(saveExternalIdentity).not.toHaveBeenCalled();
    },
  );

  it('fails closed if the owner role is missing', async () => {
    findExternalIdentity.mockResolvedValue(null);
    findOwnerRole.mockResolvedValue(null);

    await expect(
      service.resolveAdminUser(
        'https://id.example/realms/vegyfresh',
        'kc-new-admin',
        { email: 'new@example.com', name: 'New Owner' },
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(createUser).not.toHaveBeenCalled();
    expect(saveExternalIdentity).not.toHaveBeenCalled();
  });

  it('reloads and returns a concurrently-created mapping after a unique conflict', async () => {
    const linkedIdentity = {
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-race-admin',
      identity_type: 'user',
      user_id: 'race-winner-user-id',
      client_id: null,
    };
    findExternalIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(linkedIdentity);
    transaction.mockRejectedValueOnce({
      code: '23505',
    });
    findUser.mockResolvedValue({
      id: linkedIdentity.user_id,
      email: 'winner@example.com',
      organization: null,
      role: { name: 'owner', permissions: [{ action: '*', resource: '*' }] },
    });

    const user = await service.resolveAdminUser(
      linkedIdentity.issuer,
      linkedIdentity.subject,
      { email: 'winner@example.com', name: 'Winner' },
    );

    expect(user.sub).toBe(linkedIdentity.user_id);
    expect(findUser).toHaveBeenCalledWith({
      where: { id: linkedIdentity.user_id },
      relations: { role: true, organization: true },
    });
  });

  it('turns a concurrent email uniqueness conflict into USER_NOT_LINKED', async () => {
    findExternalIdentity.mockResolvedValue(null);
    transaction.mockRejectedValueOnce({
      code: '23505',
    });
    findUserByEmail.mockResolvedValue({ id: 'other-user-id' });

    await expect(
      service.resolveAdminUser(
        'https://id.example/realms/vegyfresh',
        'kc-other-admin',
        { email: 'same@example.com', name: 'Other User' },
      ),
    ).rejects.toMatchObject({
      response: { code: 'USER_NOT_LINKED' },
    });
  });

  it('maps portal subjects only through an existing portal-client identity', async () => {
    findExternalIdentity.mockResolvedValue({
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-client-subject',
      identity_type: 'portal-client',
      user_id: null,
      client_id: 'local-client-id',
    });
    findClient.mockResolvedValue({
      id: 'local-client-id',
      email: 'client@database.example',
      organization_id: 'client-org-id',
      organization: { id: 'client-org-id' },
    });

    const client = await service.resolvePortalClient(
      'https://id.example/realms/vegyfresh',
      'kc-client-subject',
    );

    expect(client).toEqual({
      sub: 'local-client-id',
      email: 'client@database.example',
      organization_id: 'client-org-id',
      type: 'portal-client',
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('does not provision a portal user when no portal mapping exists', async () => {
    findExternalIdentity.mockResolvedValue(null);

    await expect(
      service.resolvePortalClient(
        'https://id.example/realms/vegyfresh',
        'unmapped-portal-subject',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(transaction).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects a mapped user who is no longer active in their organization', async () => {
    findExternalIdentity.mockResolvedValue({
      issuer: 'https://id.example/realms/vegyfresh',
      subject: 'kc-subject-1',
      identity_type: 'user',
      user_id: 'local-user-id',
      client_id: null,
    });
    findUser.mockResolvedValue({
      id: 'local-user-id',
      organization_id: 'missing-org-id',
      organization: null,
      role: { name: 'operator', permissions: [] },
    });

    await expect(
      service.resolveUser(
        'https://id.example/realms/vegyfresh',
        'kc-subject-1',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
