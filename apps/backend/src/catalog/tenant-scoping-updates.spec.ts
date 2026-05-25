import { ProductsService } from './products/products.service';
import { PriceListsService } from './price-lists/price-lists.service';
import { ProductPricesService } from './product-prices/product-prices.service';

describe('Tenant-scoped service updates', () => {
  it('forces organization_id from active organization when updating products', async () => {
    const productsRepository = {
      merge: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      manager: { query: jest.fn() },
    };
    const service = new ProductsService(
      productsRepository as never,
      {} as never,
    );
    const existingProduct = {
      id: 'product-1',
      supplier: { id: 'supplier-1' },
      organization_id: 'org-1',
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(existingProduct as never);

    await service.update(
      'product-1',
      { name: 'Updated', organization_id: 'org-2' } as never,
      'org-1',
    );

    expect(productsRepository.merge).toHaveBeenCalledWith(
      existingProduct,
      expect.objectContaining({
        name: 'Updated',
        organization_id: 'org-1',
      }),
    );
  });

  it('forces organization_id from active organization when updating price lists', async () => {
    const priceListsRepository = {
      merge: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      manager: { query: jest.fn() },
    };
    const service = new PriceListsService(priceListsRepository as never);
    const existingPriceList = { id: 'price-list-1', organization_id: 'org-1' };
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(existingPriceList as never);

    await service.update(
      'price-list-1',
      { name: 'Updated', organization_id: 'org-2' } as never,
      'org-1',
    );

    expect(priceListsRepository.merge).toHaveBeenCalledWith(
      existingPriceList,
      expect.objectContaining({
        name: 'Updated',
        organization_id: 'org-1',
      }),
    );
  });

  it('forces organization_id from active organization when updating product prices', async () => {
    const productPricesRepository = {
      merge: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new ProductPricesService(
      productPricesRepository as never,
      {} as never,
      {} as never,
    );
    const existingProductPrice = {
      id: 'product-price-1',
      product: { id: 'product-1' },
      priceList: { id: 'price-list-1' },
      organization_id: 'org-1',
    };
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(existingProductPrice as never);

    await service.update(
      'product-price-1',
      { price: 1, organization_id: 'org-2' } as never,
      'org-1',
    );

    expect(productPricesRepository.merge).toHaveBeenCalledWith(
      existingProductPrice,
      expect.objectContaining({
        price: 1,
        organization_id: 'org-1',
      }),
    );
  });
});
