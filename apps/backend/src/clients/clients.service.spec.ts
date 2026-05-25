import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  it('forces organization_id from active organization on update', async () => {
    const clientsRepository = {
      merge: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      manager: { query: jest.fn() },
    };
    const priceListsRepository = {};
    const service = new ClientsService(
      clientsRepository as never,
      priceListsRepository as never,
    );
    const existingClient = {
      id: 'client-1',
      price_list_id: null,
      priceList: null,
      organization_id: 'org-1',
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(existingClient as never);

    await service.update(
      'client-1',
      { name: 'Updated', organization_id: 'org-2' } as never,
      'org-1',
    );

    expect(clientsRepository.merge).toHaveBeenCalledWith(
      existingClient,
      expect.objectContaining({
        name: 'Updated',
        organization_id: 'org-1',
      }),
    );
  });
});
