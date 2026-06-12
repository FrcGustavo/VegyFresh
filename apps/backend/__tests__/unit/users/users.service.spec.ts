import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import type { CreateUserDto } from 'src/users/dto/create-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    manager: { transaction: jest.Mock };
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
  };
  let rolesRepository: { findOneBy: jest.Mock };
  let managerUsersRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let manager: {
    getRepository: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(async () => {
    managerUsersRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return managerUsersRepository;
        }

        return undefined;
      }),
      query: jest.fn().mockResolvedValue([{ folio: 1 }]),
    };
    usersRepository = {
      manager: {
        transaction: jest.fn((callback: (m: unknown) => unknown) =>
          callback(manager),
        ),
      },
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    };
    rolesRepository = {
      findOneBy: jest.fn(),
    };
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeCreateDto = (
    overrides: Partial<CreateUserDto> = {},
  ): CreateUserDto => ({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'very-secure-password',
    role_id: 'role-1',
    ...overrides,
  });

  it('rejects admin assignment by non-owner creators', async () => {
    rolesRepository.findOneBy.mockResolvedValue({
      id: 'role-1',
      name: 'admin',
    });

    await expect(
      service.create(makeCreateDto(), 'org-1', 'member'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates users scoped to organization_id', async () => {
    rolesRepository.findOneBy.mockResolvedValue({
      id: 'role-1',
      name: 'member',
    });
    managerUsersRepository.create.mockReturnValue({ id: 'user-1' });
    managerUsersRepository.save.mockResolvedValue({ id: 'user-1' });

    await service.create(makeCreateDto(), 'org-1', 'owner');

    expect(managerUsersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        role_id: 'role-1',
      }),
    );
    expect(managerUsersRepository.save).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it('prevents removing the last active owner of an organization', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
      role: { name: 'owner' },
    });

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.remove('user-1', 'org-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(usersRepository.remove).not.toHaveBeenCalled();
  });

  it('deletes user when organization has another owner', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
      role: { name: 'owner' },
    });

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.remove('user-1', 'org-1');

    expect(usersRepository.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
    );
    expect(result).toEqual({
      id: 'user-1',
      deleted: true,
    });
  });
});
