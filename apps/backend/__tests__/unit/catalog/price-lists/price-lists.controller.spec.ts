import { BadRequestException } from '@nestjs/common';
import { PriceListsController } from 'src/catalog/price-lists/price-lists.controller';
import { PriceListsService } from 'src/catalog/price-lists/price-lists.service';

describe('PriceListsController', () => {
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: PriceListsController;

  beforeEach(() => {
    controller = new PriceListsController(
      serviceMock as unknown as PriceListsService,
    );
    jest.clearAllMocks();
  });

  it('delegates create with tenant scope', async () => {
    const dto = { name: 'Retail' };
    serviceMock.create.mockResolvedValue({ id: 'pl-1' });

    const result = await controller.create(dto, {
      org_id: 'org-1',
    } as never);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, 'org-1');
    expect(result).toEqual({ id: 'pl-1' });
  });

  it('delegates findAll with parsed query params', async () => {
    serviceMock.findAll.mockResolvedValue([{ id: 'pl-1' }]);

    const result = await controller.findAll(
      { org_id: 'org-1' } as never,
      'retail',
      'name',
      'desc',
      '10',
      '5',
    );

    expect(serviceMock.findAll).toHaveBeenCalledWith(
      {
        search: 'retail',
        orderBy: 'name',
        order: 'DESC',
        limit: 10,
        offset: 5,
      },
      'org-1',
    );
    expect(result).toEqual([{ id: 'pl-1' }]);
  });

  it('rejects invalid order values', () => {
    expect(() =>
      controller.findAll(
        { org_id: 'org-1' } as never,
        undefined,
        undefined,
        'down',
      ),
    ).toThrow(BadRequestException);
  });
});
