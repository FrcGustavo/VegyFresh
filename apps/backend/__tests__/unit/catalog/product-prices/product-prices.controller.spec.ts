import { ProductPricesController } from 'src/catalog/product-prices/product-prices.controller';
import { ProductPricesService } from 'src/catalog/product-prices/product-prices.service';

describe('ProductPricesController', () => {
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: ProductPricesController;

  beforeEach(() => {
    controller = new ProductPricesController(
      serviceMock as unknown as ProductPricesService,
    );
    jest.clearAllMocks();
  });

  it('delegates create with organization', async () => {
    const dto = { product_id: 'product-1', price_list_id: 'pl-1', price: 10 };
    serviceMock.create.mockResolvedValue({ id: 'pp-1' });

    const result = await controller.create(dto, {
      org_id: 'org-1',
    } as never);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, 'org-1');
    expect(result).toEqual({ id: 'pp-1' });
  });

  it('delegates update with organization', async () => {
    const dto = { price: 11 };
    serviceMock.update.mockResolvedValue({ id: 'pp-1' });

    const result = await controller.update('pp-1', dto, {
      org_id: 'org-1',
    } as never);

    expect(serviceMock.update).toHaveBeenCalledWith('pp-1', dto, 'org-1');
    expect(result).toEqual({ id: 'pp-1' });
  });
});
