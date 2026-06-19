import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsService', () => {
  it('creates an organization while locking the user and folio sequence', async () => {
    const organizationsRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue({ id: 'org-1', folio: 'ORG0001' }),
    };
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        organization_id: null,
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce(organizationsRepository)
        .mockReturnValueOnce(usersRepository),
      query: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const foliosService = {
      generateFolio: jest.fn().mockResolvedValue('ORG0001'),
    };
    const service = new OrganizationsService(
      {} as never,
      foliosService as never,
      dataSource as never,
    );

    const result = await service.create({ name: 'Organization 1' }, 'user-1');

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['organizations:folio'],
    );
    expect(usersRepository.update).toHaveBeenCalledWith(
      { id: 'user-1' },
      { organization_id: 'org-1' },
    );
    expect(result).toEqual({ id: 'org-1', folio: 'ORG0001' });
  });

  it('rejects creation when the locked user already has an organization', async () => {
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        organization_id: 'org-existing',
      }),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce({})
        .mockReturnValueOnce(usersRepository),
      query: jest.fn(),
    };
    const service = new OrganizationsService(
      {} as never,
      {} as never,
      {
        transaction: jest.fn(
          (
            callback: (transactionManager: typeof manager) => Promise<unknown>,
          ) => callback(manager),
        ),
      } as never,
    );

    await expect(
      service.create({ name: 'Organization 2' }, 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('findOne scopes by organization id and user membership', async () => {
    const organizationsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'org-1' }),
      merge: jest.fn(),
      save: jest.fn(),
    };
    const service = new OrganizationsService(
      organizationsRepository as never,
      {} as never,
      {} as never,
    );

    const result = await service.findOne('org-1', 'user-1');

    expect(organizationsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'org-1', users: { id: 'user-1' } },
    });
    expect(result).toEqual({ id: 'org-1' });
  });

  it('findOne throws when user has no access to organization', async () => {
    const organizationsRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      merge: jest.fn(),
      save: jest.fn(),
    };
    const service = new OrganizationsService(
      organizationsRepository as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne('org-2', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
