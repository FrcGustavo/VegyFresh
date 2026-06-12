import { ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsService', () => {
  it('scopes organization listing by current user organization_id', async () => {
    const organizationsRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'org-1' }]),
      findOne: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const service = new OrganizationsService(
      organizationsRepository as never,
      {} as never,
    );

    await service.findAll('org-1');

    expect(organizationsRepository.find).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      order: { created_at: 'DESC' },
    });
  });

  it('denies access to another organization id', async () => {
    const organizationsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const service = new OrganizationsService(
      organizationsRepository as never,
      {} as never,
    );

    await expect(service.findOne('org-2', 'org-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
