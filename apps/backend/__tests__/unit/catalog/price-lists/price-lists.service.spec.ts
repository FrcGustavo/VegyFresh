import { NotFoundException } from '@nestjs/common';
import { PriceListsService } from 'src/catalog/price-lists/price-lists.service';

describe('PriceListsService', () => {
  const priceListsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const foliosService = {
    generateFolio: jest.fn(),
  };

  let service: PriceListsService;

  beforeEach(() => {
    service = new PriceListsService(
      priceListsRepository as never,
      foliosService as never,
    );
    jest.clearAllMocks();
  });

  it('creates price list with generated folio and organization', async () => {
    foliosService.generateFolio.mockResolvedValue('PL0001');
    priceListsRepository.create.mockImplementation((value) => value);
    priceListsRepository.save.mockResolvedValue({ id: 'pl-1' });

    await service.create({ name: 'Retail' }, 'org-1');

    expect(foliosService.generateFolio).toHaveBeenCalledWith(
      'price_lists',
      'org-1',
    );
    expect(priceListsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Retail',
        folio: 'PL0001',
        organization_id: 'org-1',
      }),
    );
  });

  it('throws when findOne cannot resolve entity', async () => {
    priceListsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('pl-1', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
