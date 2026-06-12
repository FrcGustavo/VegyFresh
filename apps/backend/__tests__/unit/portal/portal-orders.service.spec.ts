import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PortalOrdersService } from 'src/portal/portal-orders.service';

describe('PortalOrdersService', () => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const ordersRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    findOne: jest.fn(),
  };

  let service: PortalOrdersService;

  beforeEach(() => {
    service = new PortalOrdersService(ordersRepository as never);
    jest.clearAllMocks();
  });

  it('builds scoped query for portal client orders', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'order-1' }]);

    const result = await service.findAll(
      { sub: 'client-1', organization_id: 'org-1' } as never,
      {} as never,
    );

    expect(ordersRepository.createQueryBuilder).toHaveBeenCalledWith('order');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'order.organization_id = :organizationId',
      { organizationId: 'org-1' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'order.client_id = :clientId',
      { clientId: 'client-1' },
    );
    expect(result).toEqual([{ id: 'order-1' }]);
  });

  it('throws when order is not found', async () => {
    ordersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne(
        { sub: 'client-1', organization_id: 'org-1' } as never,
        'missing-order',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when client requests another client order', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      client_id: 'client-2',
      organization_id: 'org-1',
    });

    await expect(
      service.findOne(
        { sub: 'client-1', organization_id: 'org-1' } as never,
        'order-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
