import { PortalOrdersController } from 'src/portal/portal-orders.controller';
import { PortalOrdersService } from 'src/portal/portal-orders.service';

describe('PortalOrdersController', () => {
  const serviceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  let controller: PortalOrdersController;

  beforeEach(() => {
    controller = new PortalOrdersController(
      serviceMock as unknown as PortalOrdersService,
    );
    jest.clearAllMocks();
  });

  it('delegates findAll', async () => {
    const user = { sub: 'client-1', organization_id: 'org-1' };
    const query = { page: '1', pageSize: '10' };
    serviceMock.findAll.mockResolvedValue([{ id: 'order-1' }]);

    const result = await controller.findAll(user as never, query as never);

    expect(serviceMock.findAll).toHaveBeenCalledWith(user, query);
    expect(result).toEqual([{ id: 'order-1' }]);
  });

  it('delegates findOne', async () => {
    const user = { sub: 'client-1', organization_id: 'org-1' };
    serviceMock.findOne.mockResolvedValue({ id: 'order-1' });

    const result = await controller.findOne(user as never, 'order-1');

    expect(serviceMock.findOne).toHaveBeenCalledWith(user, 'order-1');
    expect(result).toEqual({ id: 'order-1' });
  });
});
