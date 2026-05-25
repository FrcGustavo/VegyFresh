import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  it('forces organization_id from active organization on update', async () => {
    const suppliersRepository = {
      merge: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      manager: { query: jest.fn() },
    };
    const service = new SuppliersService(suppliersRepository as never);
    const existingSupplier = { id: 'supplier-1', organization_id: 'org-1' };
    jest.spyOn(service, 'findOne').mockResolvedValue(existingSupplier as never);

    await service.update(
      'supplier-1',
      { name: 'Updated', organization_id: 'org-2' } as never,
      'org-1',
    );

    expect(suppliersRepository.merge).toHaveBeenCalledWith(
      existingSupplier,
      expect.objectContaining({
        name: 'Updated',
        organization_id: 'org-1',
      }),
    );
  });
});
