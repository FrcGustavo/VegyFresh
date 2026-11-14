import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { ClientsService } from 'src/clients/clients.service';
import { ProductsService } from 'src/catalog/products/products.service';
import { OrdersService } from 'src/orders/orders.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(() => {
    service = new WhatsappService(
      {
        whatsapp: {
          verifyToken: 'verify-token',
          organizationId: 'org-1',
          botUserId: 'user-1',
          accessToken: '',
          phoneNumberId: '',
          apiVersion: 'v20.0',
          appSecret: 'secret',
        },
      } as never,
      { interpretMessage: jest.fn() } as never,
      {} as ClientsService,
      {} as ProductsService,
      {} as OrdersService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
