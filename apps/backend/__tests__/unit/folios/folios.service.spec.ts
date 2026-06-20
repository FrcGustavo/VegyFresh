import { NotFoundException } from '@nestjs/common';
import { FoliosService } from 'src/folios/folios.service';
import { Organization } from 'src/organizations/entities/organization.entity';

describe('FoliosService', () => {
  const countMock = jest.fn();
  const findOneMock = jest.fn();
  const getRepositoryMock = jest.fn((entity: unknown) => {
    if (entity === Organization) {
      return {
        count: countMock,
        findOne: findOneMock,
      };
    }

    return {
      count: countMock,
    };
  });
  const dataSource = {
    getRepository: getRepositoryMock,
  };

  let service: FoliosService;

  beforeEach(() => {
    service = new FoliosService(dataSource as never);
    countMock.mockReset();
    findOneMock.mockReset();
  });

  it('generates organization folio with ORG prefix', async () => {
    countMock.mockResolvedValue(1);

    const folio = await service.generateFolio('organizations');

    expect(folio).toBe('ORG0002');
  });

  it('requires organization id for non-organization resources', async () => {
    await expect(service.generateFolio('products')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when organization does not exist', async () => {
    findOneMock.mockResolvedValue(null);

    await expect(
      service.generateFolio('products', 'missing-org'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('counts purchases using the registered Purchase entity', async () => {
    findOneMock.mockResolvedValue({
      id: 'org-id',
      purchase_folio_prefix: 'C',
    });
    countMock.mockResolvedValue(4);

    await expect(
      service.generateFolio('inventory_entries', 'org-id'),
    ).resolves.toBe('C0005');
    expect(getRepositoryMock).toHaveBeenCalledWith('Purchase');
  });
});
