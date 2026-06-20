import { Test } from '@nestjs/testing';
import { RolesController } from '../../src/roles/roles.controller';
import { RolesService } from '../../src/roles/roles.service';

describe('RolesController', () => {
  const roles = [
    { id: 'role-admin', name: 'admin', permissions: [] },
    { id: 'role-owner', name: 'owner', permissions: [] },
  ];
  const rolesService = {
    findAll: jest.fn().mockResolvedValue(roles),
    ensureRole: jest
      .fn()
      .mockImplementation(
        (name: string, permissions: Record<string, unknown>[]) => ({
          id: 'role-created',
          name,
          permissions,
        }),
      ),
  };
  let controller: RolesController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: rolesService }],
    }).compile();
    controller = module.get(RolesController);
    jest.clearAllMocks();
  });

  it('lists roles through the service', async () => {
    await expect(controller.findAll()).resolves.toEqual(roles);
    expect(rolesService.findAll).toHaveBeenCalledTimes(1);
  });

  it('creates a role idempotently through the service', async () => {
    const input = {
      name: 'operativo',
      permissions: [{ action: 'read', resource: 'catalog' }],
    };
    expect(await controller.create(input)).toEqual({
      id: 'role-created',
      ...input,
    });
    expect(rolesService.ensureRole).toHaveBeenCalledWith(
      input.name,
      input.permissions,
    );
  });
});
