import { ClientsController } from 'src/clients/clients.controller';
import { ClientsService } from 'src/clients/clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;

  beforeEach(() => {
    controller = new ClientsController({} as ClientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
