import { OrganizationsController } from 'src/organizations/organizations.controller';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsController', () => {
  const serviceMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let controller: OrganizationsController;

  beforeEach(() => {
    controller = new OrganizationsController(
      serviceMock as unknown as OrganizationsService,
    );
    jest.clearAllMocks();
  });

  it('delegates create using current user id', async () => {
    const dto = { name: 'Org 1' };
    serviceMock.create.mockResolvedValue({ id: 'org-1' });

    const result = await controller.create(dto as never, { sub: 'user-1' } as never);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, 'user-1');
    expect(result).toEqual({ id: 'org-1' });
  });

  it('delegates findOne using user context', async () => {
    serviceMock.findOne.mockResolvedValue({ id: 'org-1' });

    const result = await controller.findOne('org-1', { sub: 'user-1' } as never);

    expect(serviceMock.findOne).toHaveBeenCalledWith('org-1', 'user-1');
    expect(result).toEqual({ id: 'org-1' });
  });
});
