import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from 'src/roles/roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from 'src/roles/entities/role.entity';

describe('RolesService', () => {
  let service: RolesService;
  const rolesRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    rolesRepository.findOneBy.mockReset();
    rolesRepository.create.mockReset();
    rolesRepository.save.mockReset();
    rolesRepository.find.mockReset();
    rolesRepository.findOne.mockReset();
    rolesRepository.merge.mockReset();
    rolesRepository.remove.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: rolesRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('seeds owner and admin roles when missing', async () => {
    rolesRepository.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    rolesRepository.create.mockImplementation((value) => value);
    rolesRepository.save.mockImplementation(async (value) => value);

    await service.setupDefaultRoles();

    expect(rolesRepository.save).toHaveBeenCalledTimes(2);
    expect(rolesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'owner' }),
    );
    expect(rolesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'admin' }),
    );
  });

  it('does not recreate roles that already exist', async () => {
    rolesRepository.findOneBy
      .mockResolvedValueOnce({ id: 'owner-id', name: 'owner' })
      .mockResolvedValueOnce({ id: 'admin-id', name: 'admin' });

    await service.setupDefaultRoles();

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });
});
