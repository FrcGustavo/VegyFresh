import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsService', () => {
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
