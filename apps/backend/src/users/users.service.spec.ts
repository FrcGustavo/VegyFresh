import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import {
  OrganizationUser,
  OrganizationUserRole,
} from '../organizations/entities/organization-user.entity';
import type { CreateUserDto } from './dto/create-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    manager: { transaction: jest.Mock };
  };
  let rolesRepository: { findOneBy: jest.Mock };
  let organizationUsersRepository: Record<string, unknown>;
  let managerUsersRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    remove: jest.Mock;
  };
  let managerOrganizationUsersRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  let manager: {
    getRepository: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(async () => {
    managerUsersRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
    };
    managerOrganizationUsersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return managerUsersRepository;
        }
        if (entity === OrganizationUser) {
          return managerOrganizationUsersRepository;
        }

        return undefined;
      }),
      query: jest.fn().mockResolvedValue([{ folio: 1 }]),
    };
    usersRepository = {
      manager: {
        transaction: jest.fn(async (callback: (m: unknown) => unknown) =>
          callback(manager),
        ),
      },
    };
    rolesRepository = {
      findOneBy: jest.fn(),
    };
    organizationUsersRepository = {};
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        {
          provide: getRepositoryToken(OrganizationUser),
          useValue: organizationUsersRepository,
        },
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
      service.create(
        makeCreateDto({ organization_role: OrganizationUserRole.ADMIN }),
        'org-1',
        OrganizationUserRole.MEMBER,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates membership during user creation', async () => {
    rolesRepository.findOneBy.mockResolvedValue({
      id: 'role-1',
      name: 'member',
    });
    managerUsersRepository.create.mockReturnValue({ id: 'user-1' });
    managerUsersRepository.save.mockResolvedValue({ id: 'user-1' });
    managerOrganizationUsersRepository.create.mockReturnValue({
      id: 'membership-1',
    });

    await service.create(makeCreateDto(), 'org-1', OrganizationUserRole.OWNER);

    expect(managerOrganizationUsersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        organization_id: 'org-1',
        role: OrganizationUserRole.MEMBER,
        is_active: true,
      }),
    );
    expect(managerOrganizationUsersRepository.save).toHaveBeenCalledWith({
      id: 'membership-1',
    });
  });

  it('prevents removing the last active owner of an organization', async () => {
    managerOrganizationUsersRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.OWNER,
      is_active: true,
    });
    managerOrganizationUsersRepository.count.mockResolvedValue(1);

    await expect(service.remove('user-1', 'org-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(managerOrganizationUsersRepository.update).not.toHaveBeenCalled();
  });

  it('deactivates membership without hard-deleting user when other active memberships exist', async () => {
    managerOrganizationUsersRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.MEMBER,
      is_active: true,
    });
    managerOrganizationUsersRepository.count.mockResolvedValue(2);

    const result = await service.remove('user-1', 'org-1');

    expect(managerOrganizationUsersRepository.update).toHaveBeenCalledWith(
      { id: 'membership-1' },
      { is_active: false },
    );
    expect(result).toEqual({
      id: 'user-1',
      deleted: false,
      membership_deactivated: true,
    });
    expect(managerUsersRepository.remove).not.toHaveBeenCalled();
  });

  it('hard-deletes user when no active memberships remain', async () => {
    managerOrganizationUsersRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      role: OrganizationUserRole.MEMBER,
      is_active: true,
    });
    managerOrganizationUsersRepository.count.mockResolvedValue(0);
    managerUsersRepository.findOneBy.mockResolvedValue({ id: 'user-1' });
    managerUsersRepository.remove.mockResolvedValue(undefined);

    const result = await service.remove('user-1', 'org-1');

    expect(managerUsersRepository.remove).toHaveBeenCalledWith({
      id: 'user-1',
    });
    expect(result).toEqual({
      id: 'user-1',
      deleted: true,
      membership_deactivated: true,
    });
  });
});
