import { NotFoundException } from '@nestjs/common';
import { ProductPricesService } from 'src/catalog/product-prices/product-prices.service';

describe('ProductPricesService', () => {
  const productPricesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const productsRepository = {
    findOneBy: jest.fn(),
  };
  const priceListsRepository = {
    findOneBy: jest.fn(),
  };

  let service: ProductPricesService;

  beforeEach(() => {
    service = new ProductPricesService(
      productPricesRepository as never,
      productsRepository as never,
      priceListsRepository as never,
    );
    jest.clearAllMocks();
  });

  it('creates product price when product and list are valid', async () => {
    productsRepository.findOneBy.mockResolvedValue({ id: 'product-1' });
    priceListsRepository.findOneBy.mockResolvedValue({ id: 'pl-1' });
    productPricesRepository.create.mockImplementation((value) => value);
    productPricesRepository.save.mockResolvedValue({ id: 'pp-1' });

    await service.create(
      {
        product_id: 'product-1',
        price_list_id: 'pl-1',
        price: 9.99,
      },
      'org-1',
    );

    expect(productPricesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1' }),
    );
  });

  it('throws when linked product does not exist in organization', async () => {
    productsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create(
        {
          product_id: 'missing-product',
          price_list_id: 'pl-1',
          price: 9.99,
        },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
