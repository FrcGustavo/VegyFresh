import { InventoryController } from 'src/inventory/inventory.controller';
import { InventoryService } from 'src/inventory/inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  const inventoryServiceMock = {
    findInventory: jest.fn(),
    findInventoryMovements: jest.fn(),
    createAdjustment: jest.fn(),
  };

  beforeEach(() => {
    controller = new InventoryController(
      inventoryServiceMock as unknown as InventoryService,
    );
    jest.clearAllMocks();
  });

  it('delegates inventory listing to service with organization scope', async () => {
    inventoryServiceMock.findInventory.mockResolvedValue([{ id: 'product-1' }]);

    const result = await controller.findInventory('org-1');

    expect(inventoryServiceMock.findInventory).toHaveBeenCalledWith('org-1');
    expect(result).toEqual([{ id: 'product-1' }]);
  });

  it('delegates adjustment creation with authenticated user id', async () => {
    const dto = { product_id: 'product-1', quantity: 1, reason: 'Count fix' };
    inventoryServiceMock.createAdjustment.mockResolvedValue({ id: 'move-1' });

    const result = await controller.createAdjustment(dto, 'org-1', {
      sub: 'user-1',
    } as never);

    expect(inventoryServiceMock.createAdjustment).toHaveBeenCalledWith(
      dto,
      'org-1',
      'user-1',
    );
    expect(result).toEqual({ id: 'move-1' });
  });
});
