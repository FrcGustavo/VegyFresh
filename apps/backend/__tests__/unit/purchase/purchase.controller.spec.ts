import { PurchaseController } from 'src/purchase/purchase.controller';
import { PurchaseService } from 'src/purchase/purchase.service';

describe('PurchaseController', () => {
  const purchaseServiceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  let controller: PurchaseController;

  beforeEach(() => {
    controller = new PurchaseController(
      purchaseServiceMock as unknown as PurchaseService,
    );
    jest.clearAllMocks();
  });

  it('delegates findAll', async () => {
    purchaseServiceMock.findAll.mockResolvedValue([{ id: 'purchase-1' }]);

    const result = await controller.findAll('org-1');

    expect(purchaseServiceMock.findAll).toHaveBeenCalledWith('org-1');
    expect(result).toEqual([{ id: 'purchase-1' }]);
  });

  it('delegates create with organization and user', async () => {
    const dto = { supplier_id: 'supplier-1', items: [] };
    purchaseServiceMock.create.mockResolvedValue({ id: 'purchase-1' });

    const result = await controller.create(dto, 'org-1', {
      sub: 'user-1',
    } as never);

    expect(purchaseServiceMock.create).toHaveBeenCalledWith(
      dto,
      'org-1',
      'user-1',
    );
    expect(result).toEqual({ id: 'purchase-1' });
  });
});
