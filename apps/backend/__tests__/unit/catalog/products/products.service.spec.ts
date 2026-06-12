import { NotFoundException } from '@nestjs/common';
import { ProductsService } from 'src/catalog/products/products.service';

describe('ProductsService', () => {
  const productsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const suppliersRepository = {
    findOneBy: jest.fn(),
  };
  const foliosService = {
    generateFolio: jest.fn(),
  };

  let service: ProductsService;

  beforeEach(() => {
    service = new ProductsService(
      productsRepository as never,
      suppliersRepository as never,
      foliosService as never,
    );
    jest.clearAllMocks();
  });

  it('creates product with defaults and tenant scope', async () => {
    suppliersRepository.findOneBy.mockResolvedValue({ id: 'supplier-1' });
    foliosService.generateFolio.mockResolvedValue('P0001');
    productsRepository.create.mockImplementation((value) => value);
    productsRepository.save.mockResolvedValue({ id: 'product-1' });

    await service.create(
      {
        name: 'Tomato',
        supplier_id: 'supplier-1',
      } as never,
      'org-1',
    );

    expect(productsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folio: 'P0001',
        organization_id: 'org-1',
        stock: 0,
        images: [],
      }),
    );
  });

  it('throws when supplier is outside organization scope', async () => {
    suppliersRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create(
        { name: 'Tomato', supplier_id: 'missing-supplier' } as never,
        'org-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
