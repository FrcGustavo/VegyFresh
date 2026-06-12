import { OrdersController } from 'src/orders/orders.controller';
import { OrdersService } from 'src/orders/orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(() => {
    controller = new OrdersController({} as OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
