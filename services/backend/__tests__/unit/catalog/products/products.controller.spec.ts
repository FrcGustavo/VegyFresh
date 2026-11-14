import { BadRequestException } from '@nestjs/common';
import { ProductsController } from 'src/catalog/products/products.controller';
import { ProductsService } from 'src/catalog/products/products.service';

describe('ProductsController', () => {
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: ProductsController;

  beforeEach(() => {
    controller = new ProductsController(
      serviceMock as unknown as ProductsService,
    );
    jest.clearAllMocks();
  });

  it('delegates create', async () => {
    const dto = { name: 'Tomato', supplier_id: 'supplier-1' };
    serviceMock.create.mockResolvedValue({ id: 'product-1' });

    const result = await controller.create(dto, { org_id: 'org-1' } as never);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, 'org-1');
    expect(result).toEqual({ id: 'product-1' });
  });

  it('delegates findAll with parsed filters', async () => {
    serviceMock.findAll.mockResolvedValue([{ id: 'product-1' }]);

    const result = await controller.findAll(
      { org_id: 'org-1' } as never,
      'tom',
      'name',
      'asc',
      '5',
      '0',
    );

    expect(serviceMock.findAll).toHaveBeenCalledWith(
      {
        search: 'tom',
        orderBy: 'name',
        order: 'ASC',
        limit: 5,
        offset: 0,
      },
      'org-1',
    );
    expect(result).toEqual([{ id: 'product-1' }]);
  });

  it('rejects invalid pagination values', () => {
    expect(() =>
      controller.findAll(
        { org_id: 'org-1' } as never,
        undefined,
        undefined,
        undefined,
        '-1',
      ),
    ).toThrow(BadRequestException);
  });
});
